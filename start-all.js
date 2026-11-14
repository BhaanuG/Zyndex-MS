import { spawn, execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple .env file loader
try {
    const envPath = path.resolve(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf-8');
        for (const line of envConfig.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
                const [key, ...valueParts] = trimmed.split('=');
                let val = valueParts.join('=').trim().replace(/^['"]|['"]$/g, ''); // strip optional quotes
                // Gmail displays app passwords in groups; SMTP authentication needs the compact value.
                if (key.trim() === 'OTP_SMTP_PASS') {
                    val = val.replace(/\s+/g, '');
                }
                process.env[key.trim()] = val;
            }
        }
    }
} catch (e) {
    console.warn('[SYSTEM] Failed to load .env file:', e.message);
}

// Robust dynamic JAVA_HOME discovery for local setup
function findJavaHome() {
    if (process.env.JAVA_HOME && fs.existsSync(process.env.JAVA_HOME)) {
        return process.env.JAVA_HOME;
    }

    const searchDirs = [
        path.join(process.env.USERPROFILE || 'C:\\Users\\DELL', '.vscode', 'extensions'),
        'C:\\Program Files\\Java',
        'C:\\Program Files\\Eclipse Adoptium',
        'C:\\Program Files\\Microsoft',
        'C:\\Program Files\\Amazon Corretto'
    ];

    for (const dir of searchDirs) {
        if (fs.existsSync(dir)) {
            try {
                const entries = fs.readdirSync(dir, { withFileTypes: true });
                for (const entry of entries) {
                    if (entry.isDirectory()) {
                        // Check VS Code redhat.java extensions
                        if (entry.name.startsWith('redhat.java-')) {
                            const jreBase = path.join(dir, entry.name, 'jre');
                            if (fs.existsSync(jreBase)) {
                                const jreEntries = fs.readdirSync(jreBase);
                                for (const jreEntry of jreEntries) {
                                    const candidate = path.join(jreBase, jreEntry);
                                    if (fs.existsSync(path.join(candidate, 'bin', 'java.exe'))) {
                                        return candidate;
                                    }
                                }
                            }
                        }
                        // Check standard JDK dirs
                        const directCandidate = path.join(dir, entry.name);
                        if (fs.existsSync(path.join(directCandidate, 'bin', 'java.exe'))) {
                            return directCandidate;
                        }
                    }
                }
            } catch (err) {
                // ignore permission or read errors
            }
        }
    }
    return null;
}

const detectedJava = findJavaHome();
if (detectedJava) {
    process.env.JAVA_HOME = detectedJava;
    const javaBin = path.join(detectedJava, 'bin');
    if (!process.env.PATH.includes(javaBin)) {
        process.env.PATH = `${javaBin};${process.env.PATH}`;
    }
    console.log(`[SYSTEM] Configured JAVA_HOME: ${detectedJava}`);
} else {
    console.warn('[SYSTEM] WARNING: Could not automatically detect a valid Java installation.');
}

const isWindows = process.platform === 'win32';
const mvn = path.resolve(__dirname, isWindows ? 'mvnw.cmd' : 'mvnw');
const npm = isWindows ? 'npm.cmd' : 'npm';

const children = [];

function stopExistingWorkspaceProcesses() {
    if (!isWindows) return;

    const workspacePath = __dirname.replace(/'/g, "''");
    const projectPorts = [8761, 8080, 8081, 8082, 8083, 8084, 8085, 6100, 5173].join(',');
    const script = `
$workspace = '${workspacePath}';
$current = ${process.pid};
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in @(${projectPorts}) } |
    Select-Object -ExpandProperty OwningProcess -Unique |
    Where-Object { $_ -ne $current } |
    ForEach-Object { taskkill /PID $_ /T /F 2>$null | Out-Null };
Get-CimInstance Win32_Process |
    Where-Object {
        $_.ProcessId -ne $current -and
        $_.CommandLine -and
        $_.CommandLine -like "*$workspace*" -and
        $_.Name -in @('java.exe', 'javaw.exe', 'node.exe')
    } |
    ForEach-Object { taskkill /PID $_.ProcessId /T /F 2>$null | Out-Null }
`;

    try {
        execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
            stdio: 'ignore',
            windowsHide: true,
        });
        console.log('[SYSTEM] Stopped existing Zyndex processes before startup.');
    } catch (error) {
        console.warn('[SYSTEM] Could not fully clean existing Zyndex processes:', error.message);
    }
}

function waitForPortClosed(port, host = 'localhost', timeoutMs = 15000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        const check = () => {
            const socket = new net.Socket();
            socket.setTimeout(500);
            const released = () => {
                socket.destroy();
                if (Date.now() - startTime >= timeoutMs) {
                    resolve(false);
                } else {
                    setTimeout(check, 250);
                }
            };
            socket.on('connect', () => {
                socket.destroy();
                if (Date.now() - startTime >= timeoutMs) {
                    resolve(false);
                } else {
                    setTimeout(check, 250);
                }
            });
            socket.on('error', () => resolve(true));
            socket.on('timeout', released);
            socket.connect(port, host);
        };
        check();
    });
}

function waitForPort(port, host = 'localhost', timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const check = () => {
            const socket = new net.Socket();
            socket.setTimeout(1500);
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('error', () => {
                socket.destroy();
                if (Date.now() - startTime >= timeoutMs) {
                    resolve(false); // timeout, proceed anyway
                } else {
                    setTimeout(check, 1000);
                }
            });
            socket.on('timeout', () => {
                socket.destroy();
                if (Date.now() - startTime >= timeoutMs) {
                    resolve(false);
                } else {
                    setTimeout(check, 1000);
                }
            });
            socket.connect(port, host);
        };
        check();
    });
}

function runProcess(name, command, args, cwd, delay = 0) {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log(`[SYSTEM] Launching ${name}...`);
            const child = spawn(command, args, {
                cwd,
                env: {
                    ...process.env,
                    DB_PORT: process.env.DB_PORT || '3306',
                    DB_USER: process.env.DB_USER || 'root',
                    DB_PASSWORD: process.env.DB_PASSWORD || ''
                },
                shell: true
            });

            child.stdout.on('data', (data) => {
                const lines = data.toString().split(/\r?\n/);
                for (const line of lines) {
                    if (line.trim()) {
                        console.log(`[${name}] ${line}`);
                    }
                }
            });

            child.stderr.on('data', (data) => {
                const lines = data.toString().split(/\r?\n/);
                for (const line of lines) {
                    if (line.trim()) {
                        console.error(`[${name}-ERR] ${line}`);
                    }
                }
            });

            child.on('error', (err) => {
                console.error(`[SYSTEM] Failed to start ${name}:`, err);
            });

            child.on('exit', (code) => {
                console.log(`[SYSTEM] ${name} process exited with code ${code}`);
            });

            children.push(child);
            resolve();
        }, delay);
    });
}

async function start() {
    stopExistingWorkspaceProcesses();
    const portsReleased = await Promise.all([8761, 8080, 8081, 8082, 8083, 8084, 8085, 5173].map((port) => waitForPortClosed(port)));
    if (portsReleased.some((released) => !released)) {
        throw new Error('One or more Zyndex ports are still in use. Stop the existing stack and run npm run dev:all again.');
    }

    // 1. Eureka Discovery Server (Port 8761)
    await runProcess('EUREKA-SERVER', mvn, ['spring-boot:run', '-pl', 'eureka-server'], __dirname);

    // Wait for Eureka to be actively listening on port 8761
    console.log('[SYSTEM] Waiting for Eureka registry server (port 8761) to become ready...');
    if (!await waitForPort(8761, 'localhost', 120000)) {
        throw new Error('Eureka Server did not become ready on port 8761 within 120 seconds.');
    }
    console.log('[SYSTEM] Eureka Server is ONLINE on port 8761!');

    // 2. Start downstream microservices
    console.log('[SYSTEM] Starting microservices (Auth, Content, Access, Usage, Subscription)...');
    await Promise.all([
        runProcess('AUTH-SERVICE', mvn, ['spring-boot:run', '-pl', 'auth-service'], __dirname),
        runProcess('CONTENT-SERVICE', mvn, ['spring-boot:run', '-pl', 'content-service'], __dirname),
        runProcess('ACCESS-SERVICE', mvn, ['spring-boot:run', '-pl', 'access-service'], __dirname),
        runProcess('USAGE-SERVICE', mvn, ['spring-boot:run', '-pl', 'usage-service'], __dirname),
        runProcess('SUBSCRIPTION-SERVICE', mvn, ['spring-boot:run', '-pl', 'subscription-service'], __dirname)
    ]);

    // Wait for Auth service port 8081 or give brief stabilization
    console.log('[SYSTEM] Waiting for core services to initialize...');
    await Promise.all([
        waitForPort(8081, 'localhost', 60000)
    ]);

    // 3. Start the gateway before exposing the frontend so initial auth and preview requests have a backend.
    console.log('[SYSTEM] Starting API Gateway...');
    await waitForPortClosed(8080);
    await runProcess('API-GATEWAY', mvn, ['spring-boot:run', '-pl', 'api-gateway'], __dirname);
    console.log('[SYSTEM] Waiting for API Gateway (port 8080) to become ready...');
    if (!await waitForPort(8080, 'localhost', 60000)) {
        throw new Error('API Gateway did not become ready on port 8080 within 60 seconds.');
    }
    console.log('[SYSTEM] API Gateway is ONLINE on port 8080!');

    console.log('[SYSTEM] Starting Vite Frontend...');
    await waitForPortClosed(5173);
    await runProcess('FRONTEND', npm, ['run', 'dev'], __dirname);
}

const cleanUp = () => {
    console.log('\n[SYSTEM] Shutting down application stack...');
    for (const child of children) {
        if (!child.killed) {
            if (isWindows) {
                spawn('taskkill', ['/pid', child.pid, '/f', '/t'], { shell: true });
            } else {
                child.kill('SIGINT');
            }
        }
    }
    process.exit(0);
};

process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);

start().catch(err => {
    console.error('[SYSTEM] Initialization failed:', err);
    cleanUp();
});
