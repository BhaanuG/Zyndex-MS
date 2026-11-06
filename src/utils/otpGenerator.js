const STORAGE_KEY = 'zyndex_used_login_otps';
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const MAX_USED_CODES = 1000;

function secureRandomInt(maxExclusive) {
  const array = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;

  do {
    crypto.getRandomValues(array);
  } while (array[0] >= limit);

  return array[0] % maxExclusive;
}

function secureShuffle(values) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomInt(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function getUsedOtps() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function rememberUsedOtp(otp) {
  const used = getUsedOtps().filter((code) => code !== otp);
  used.push(otp);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(used.slice(-MAX_USED_CODES)));
}

function isFancyPattern(code) {
  const ascending = '0123456789';
  const descending = '9876543210';
  const reversed = [...code].reverse().join('');

  return (
    ascending.includes(code) ||
    descending.includes(code) ||
    code === reversed ||
    ['1234', '2345', '3456', '4567', '5678', '6789', '9876', '8765', '7654', '6543', '5432', '4321'].includes(code)
  );
}

function getDigitCounts(usedCodes) {
  return usedCodes.join('').split('').reduce((counts, digit) => {
    counts[digit] = (counts[digit] || 0) + 1;
    return counts;
  }, {});
}

function getCandidateScore(code, digitCounts) {
  return code.split('').reduce((score, digit) => score + (digitCounts[digit] || 0), 0);
}

function isValidOtpCandidate(code, usedSet) {
  const digits = code.split('');

  return (
    code.length === 4 &&
    digits[0] !== '0' &&
    digits[3] !== '0' &&
    new Set(digits).size === 4 &&
    !usedSet.has(code) &&
    !isFancyPattern(code)
  );
}

function buildCandidates() {
  const candidates = [];

  for (const first of DIGITS.slice(1)) {
    for (const second of DIGITS) {
      for (const third of DIGITS) {
        for (const fourth of DIGITS.slice(1)) {
          const code = `${first}${second}${third}${fourth}`;
          if (new Set(code.split('')).size === 4 && !isFancyPattern(code)) {
            candidates.push(code);
          }
        }
      }
    }
  }

  return candidates;
}

export function generateLoginOtp() {
  const usedCodes = getUsedOtps();
  const usedSet = new Set(usedCodes);
  const digitCounts = getDigitCounts(usedCodes);
  const candidates = secureShuffle(buildCandidates()).filter((code) => isValidOtpCandidate(code, usedSet));

  if (candidates.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return generateLoginOtp();
  }

  const lowestScore = Math.min(...candidates.map((code) => getCandidateScore(code, digitCounts)));
  const balancedCandidates = candidates.filter((code) => getCandidateScore(code, digitCounts) === lowestScore);
  const otp = balancedCandidates[secureRandomInt(balancedCandidates.length)];

  return otp;
}

export function markLoginOtpUsed(otp) {
  rememberUsedOtp(otp);
}
