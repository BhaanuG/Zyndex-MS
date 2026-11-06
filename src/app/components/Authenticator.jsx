import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, RefreshCw, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';

// List of valid authenticator codes
const VALID_CODES = [
  '589746', '624831', '980357', '741023', '790635', '578623', '417638', '470528', '741293', '509486',
  '796108', '798254', '563271', '462107', '672804', '710692', '482675', '682513', '647893', '681047',
  '307162', '409372', '704619', '190823', '694207', '827406', '834526', '906185', '956832', '450721',
  '920347', '291536', '572048', '840329', '856231', '697038', '178234', '850429', '806374', '563208',
  '804369', '207693', '408235', '625704', '743618', '837054', '925643', '432078', '756438', '945206',
  '176425', '402815', '782145', '567981', '156438', '731256', '760315', '794856', '780913', '365829',
  '906538', '708216', '621739', '956378', '796084', '750916', '609124', '869135', '924578', '316572',
  '586391', '538142', '130487', '401937', '762941', '948563', '815796', '975031', '340865', '961052',
  '108694', '425038', '410537', '436581', '138549', '768091', '708316', '865341', '185793', '290564',
  '456738', '507329', '506138', '279046', '607843', '789436', '708243', '216905', '781426', '125786',
  '846302', '732061', '907183', '382701', '863724', '526034', '896524', '593812', '251394', '625834',
  '839624', '184657', '643572', '358671', '159846', '654132', '368024', '930615', '137925', '183524',
  '987153', '256804', '846579', '832059', '374896', '968245', '593178', '849072', '209785', '613084',
  '462508', '560193', '209753', '486305', '749823', '318096', '921683', '864907', '957134', '293465',
  '470398', '172609', '635028', '407865', '723408', '764198', '376284', '706938', '731456', '516792',
  '792086', '179432', '408256', '405137', '526973', '496203', '421937', '701624', '486375', '306715',
  '845319', '817624', '384126', '847261', '209386', '437056', '412879', '402871', '803491', '263497',
  '692834', '306549', '652018', '169487', '430591', '786134', '894753', '726951', '751368', '502786',
  '865904', '794618', '247358', '605124', '719368', '956124', '941362', '938412', '793816', '340629',
  '203679', '307456', '587023', '792681', '427953', '632718', '986015', '340175', '561942', '698207',
  '392185', '534102', '912638', '129807', '861537', '189372', '268403', '605743', '697218', '147629',
  '176489', '904256', '719624', '690832', '975281', '582067', '673824', '910467', '807153', '782304',
  '934615', '586294', '854127', '198567', '408362', '901682', '645807', '281369', '167093', '721398',
  '960237', '128706', '746215', '961453', '869073', '318792', '802139', '124538', '420865', '370629',
  '321569', '537149', '854321', '752048', '138649', '763408', '726358', '103684', '135687', '942517',
  '689372', '674209', '785269', '937016', '430762', '842791', '619785', '428631', '876403', '586014',
  '348625', '283569', '956712', '185729', '254897', '286403', '345867', '519026', '965082', '173856',
  '956724', '418062', '703216', '709456', '236019', '456901', '381079', '814537', '804591', '961248',
  '462098', '421659', '879064', '932064', '857419', '391567', '976503', '756412', '280146', '365072',
  '849052', '438025', '573486', '174025', '198753', '496103', '670195', '970538', '982415', '709426',
  '124869', '652987', '129348', '264319', '428937', '529087', '987451', '561487', '950187', '786192',
  '862407', '910738', '870465', '780693', '130892', '698127', '507324', '850164', '183264', '571394',
  '370642', '381529', '638251', '690571', '103782', '239186', '172046', '247895', '631592', '981754',
  '403918', '328906', '756284', '952874', '879652', '748305', '508723', '485763', '658312', '430168',
  '172354', '821694', '765018', '701439', '725034', '897362', '158693', '804561', '842597', '238405',
  '601729', '627059', '321695', '702856', '729508', '586742', '381029', '571234', '540862', '590638',
  '645371', '439602', '697508', '647209', '936745', '702954', '931547', '107342', '832576', '127364',
  '874651', '754018', '304629', '358279', '413907', '750623', '459382', '653784', '672105', '324896',
  '237068', '834617', '142957', '940726', '586193', '401768', '634017', '207913', '203964', '109452',
  '685304', '735618', '761803', '745269', '170459', '629701', '708163', '701345', '451603', '205946',
  '419637', '246539', '718965', '930785', '142708', '628574', '384759', '275413', '378465', '569817',
  '925704', '427658', '739426', '623941', '258109', '940867', '450681', '862719', '410568', '273146',
  '348507', '297085', '480967', '793106', '503172', '672094', '721963', '950726', '615207', '598742',
  '673951', '792415', '984236', '563279', '517234', '869714', '540128', '481762', '672485', '392186',
  '125096', '938067', '716235', '452869', '461025', '547291', '324876', '549386', '145702', '461039',
  '634987', '384029', '349267', '152306', '860312', '670528', '512907', '524637', '293048', '961457',
  '164573', '765342', '908137', '624937', '153678', '713425', '598702', '768042', '183549', '815342',
  '708362', '918042', '302781', '487519', '542368', '620483', '205719', '507184', '731625', '436827',
  '561892', '256109', '238654', '794681', '982546', '980215', '378652', '831647', '710586', '760382',
  '936047', '593768', '367098', '673159', '890541', '601784', '496751', '534081', '708519', '197208',
  '975364', '713984', '876325', '781926', '578219', '780153', '957314', '684315', '348921', '920635',
  '396082', '270845', '652048', '237468', '201478', '427031', '873654', '170253', '830124', '671425',
  '592631', '640758', '352719', '315974', '852163', '745893', '741092', '864521', '396054', '861207',
  '873942', '321094', '763914', '317925', '248731', '291703', '283657', '406735', '762894', '582194',
  '437986', '248057', '516947', '291746', '192874', '840719', '102563', '830149', '891457', '716309',
  '342501', '167085', '380625', '932468', '589013', '631857', '184362', '346975', '347218', '432708',
  '314807', '153792', '637584', '537102', '208697', '790513', '280794', '827641', '258674', '823061',
  '625304', '793128', '406732', '376092', '312579', '509386', '964325', '467852', '726513', '836941',
  '584021', '549782', '485963', '201783', '981546', '917483', '214897', '278503', '725804', '860371',
  '619082', '643057', '231789', '731824', '420537', '425789', '268437', '138425', '392156', '190568',
  '987035', '783295', '157982', '910825', '567108', '720983', '271346', '106358', '615374', '635128',
  '137825', '725463', '597813', '135026', '872916', '526308', '871253', '496871', '739068', '593218',
  '897236', '136587', '937821', '378249', '871456', '279684', '467023', '472639', '672381', '351208',
  '840659', '140865', '926538', '759681', '809671', '710923', '709364', '469851', '208943', '569782',
  '643102', '629578', '703845', '570913', '593284', '617094', '147508', '578641', '583196', '580937',
  '406917', '126749', '518437', '391846', '375829', '574938', '652739', '543018', '182045', '614958',
  '865214', '148356', '192456', '194503', '257041', '528104', '401379', '753248', '294087', '845671',
  '938514', '659037', '641097', '468953', '479213', '840756', '584271', '719523', '938162', '157426',
  '935014', '846319', '147295', '135067', '716329', '805213', '157028', '659321', '189062', '628975',
  '230967', '954318', '638472', '982567', '891064', '736908', '657491', '195472', '329684', '903467',
  '924175', '159728', '689752', '390514', '930458', '486502', '601398', '648731', '913864', '798401',
  '260593', '579483', '273416', '362874', '625019', '506297', '348927', '587602', '179402', '596174',
  '307492', '698174', '167984', '754612', '379146', '217546', '750934', '541278', '604218', '451289',
  '208319', '495628', '487913', '347619', '689534', '239176', '304971', '139672', '934576', '792081',
  '691874', '315792', '654018', '950623', '531029', '734261', '429751', '478205', '173204', '971658',
  '945083', '638592', '478365', '904216', '493561', '582174', '193206', '230715', '257069', '159873',
  '386015', '189743', '426901', '983401', '671854', '479632', '802456', '632947', '754836', '307582',
  '562973', '138064', '524791', '501638', '942378', '145623', '862053', '724635', '159324', '182705',
  '109475', '725019', '813709', '548017', '725386', '793802', '346102', '658972', '307256', '942817',
  '649538', '732508', '542361', '390768', '109453', '471038', '750189', '405781', '739562', '627809',
  '971023', '153094', '493817', '543678', '178405', '374102', '431865', '456083', '839612', '830762',
  '109672', '245378', '974518', '320189', '491235', '914278', '483092', '739016', '243697', '658412',
  '345216', '605429', '821749', '967508', '736584', '234765', '890265', '451032', '849356', '194306',
  '521087', '342589', '327584', '375948', '105729', '873194', '659841', '403169', '349758', '746805',
  '275103', '354962', '214307', '905463', '152079', '845073', '213649', '504721', '281379', '531429',
  '480297', '796243', '605294', '721084', '265409', '340958', '503896', '762054', '203649', '361457',
  '182605', '637451', '845039', '869105', '834501', '523461', '527301', '367589', '789504', '734856',
  '182497', '879024', '236041', '163809', '436957', '387649', '276143', '965231', '430856', '970613',
  '659048', '265038', '614805', '235941', '146938', '480973', '846397', '435176', '150394', '891602',
  '478163', '950768', '197465', '603218', '387604', '390651', '802714', '796031', '465831', '892614',
  '948156', '567432', '238975', '528461', '672495', '960587', '102593', '482759', '950417', '793264',
  '923506', '142783', '523601', '726543', '954306', '319468', '294163', '874162', '415238', '548031',
  '587421', '934015', '451208', '715439', '174908', '497816', '265803', '528364', '860931', '317025',
  '769035', '792634', '602973', '954673', '593874', '920367', '628314', '496087', '497386', '852793',
  '621509', '635942', '471982', '670185', '421936', '783102', '867934', '543106', '985763', '517389',
  '716458', '602197', '945821', '231605', '253698', '160972', '928706', '256187', '946082', '429038',
  '925073', '659847', '245613', '579034', '287649', '519062', '805739', '159243', '685943', '932785',
  '976483', '492765', '976148', '401256', '930621', '435809', '701368', '829037', '346192', '439508',
  '278143', '714562', '185063', '197652', '275096', '843296', '571603', '983521', '961287', '941853',
  '563942', '295104', '451729', '912365', '598736', '901284', '325674', '285731', '309142', '120987',
];

export default function Authenticator({ onSuccess, onBack }) {
  const [displayedCode, setDisplayedCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef(null);

  // Generate a random code on mount
  useEffect(() => {
    generateNewCode();
  }, []);

  const generateNewCode = () => {
    const randomCode = VALID_CODES[Math.floor(Math.random() * VALID_CODES.length)];
    setDisplayedCode(randomCode);
    setUserInput('');
    setError('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (userInput === displayedCode) {
      // Success animation
      setSuccess(true);
      setTimeout(async () => {
        try {
          await onSuccess();
        } catch (error) {
          setSuccess(false);
          setError(error?.message || 'Authentication failed. Please try again.');
          inputRef.current?.focus();
        }
      }, 1500);
    } else {
      // Invalid code - AUTO-GENERATE NEW CODE (CRITICAL FIX)
      setError('Incorrect code. A new code has been generated.');
      setShake(true);
      setTimeout(() => {
        setShake(false);
        generateNewCode(); // Automatically generate new code on wrong entry
        inputRef.current?.focus();
      }, 500);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-50">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] bg-[size:32px_32px]" />
        
        {/* Floating Orbs */}
        <motion.div
          className="absolute top-20 left-20 w-72 h-72 bg-orange-400/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-red-400/20 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header */}
      <motion.header 
        className="relative z-10 py-6 px-8 backdrop-blur-sm border-b border-orange-200/50"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-orange-600/20 rounded-xl blur-xl" />
              <div className="relative bg-gradient-to-br from-orange-600 to-red-600 p-2.5 rounded-xl shadow-lg">
                <BookOpen className="size-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Zyndex
              </h1>
              <p className="text-xs text-slate-500 font-medium">Security Verification</p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-100px)] p-6">
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {/* Card Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl blur-3xl opacity-10" />
          
          <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-orange-200/50 p-10">
            {/* Icon */}
            <motion.div 
              className="size-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-500/30"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, type: 'spring' }}
            >
              <Shield className="size-10 text-white" />
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center mb-8"
            >
              <h2 className="text-3xl font-bold text-slate-900 mb-3">
                Security Verification
              </h2>
              <p className="text-slate-600 mb-4">
                Enter the code shown below to verify you're human
              </p>
              <div className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 rounded-xl border border-orange-100 max-w-md mx-auto">
                <Lock className="size-4 text-orange-600 flex-shrink-0" />
                <p className="text-sm text-orange-900">
                  Advanced verification system to protect your account and maintain platform integrity.
                </p>
              </div>
            </motion.div>

            {/* CAPTCHA Display */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-8 relative"
            >
              <div className="p-8 bg-gradient-to-br from-orange-50 via-yellow-50 to-orange-50 rounded-2xl border-2 border-orange-200 relative overflow-hidden shadow-lg">
                {/* Pattern Background */}
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(251, 146, 60, 0.2) 10px, rgba(251, 146, 60, 0.2) 20px)',
                }} />

                {/* Code Display */}
                <div className="relative flex justify-center items-center gap-3">
                  {displayedCode.split('').map((digit, index) => (
                    <motion.div
                      key={index}
                      className="size-14 bg-white rounded-xl shadow-md flex items-center justify-center"
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ 
                        opacity: 1, 
                        y: [0, -8, 0, 8, 0],
                        rotate: [-2, -4, -2, 0, -2],
                      }}
                      transition={{
                        opacity: { delay: index * 0.1 },
                        y: {
                          duration: 3,
                          repeat: Infinity,
                          delay: index * 0.2,
                          ease: 'easeInOut',
                        },
                        rotate: {
                          duration: 3,
                          repeat: Infinity,
                          delay: index * 0.2,
                          ease: 'easeInOut',
                        }
                      }}
                    >
                      <span className="text-3xl font-bold text-slate-800">{digit}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Refresh Button */}
                <motion.button
                  onClick={generateNewCode}
                  className="absolute top-3 right-3 p-2.5 bg-white rounded-xl shadow-md hover:shadow-lg transition-all"
                  whileHover={{ scale: 1.1, rotate: 180 }}
                  whileTap={{ scale: 0.9 }}
                  title="Generate new code"
                >
                  <RefreshCw className="size-5 text-slate-600" />
                </motion.button>
              </div>
            </motion.div>

            {/* Input Form */}
            <AnimatePresence mode="wait">
              {!success ? (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Enter the 6-digit code
                  </label>
                  <motion.input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={userInput}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setUserInput(value);
                      setError('');
                    }}
                    className={`w-full px-6 py-4 text-center text-3xl font-bold border-2 rounded-xl focus:outline-none transition-all tracking-[0.5em] ${
                      error
                        ? 'border-red-500 bg-red-50 focus:border-red-600 focus:ring-4 focus:ring-red-100'
                        : 'border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100'
                    }`}
                    placeholder="______"
                    animate={{
                      x: shake ? [-10, 10, -10, 10, 0] : 0
                    }}
                    transition={{ duration: 0.5 }}
                  />

                  {/* Error Message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 mt-3 text-red-600"
                      >
                        <AlertCircle className="size-4" />
                        <span className="text-sm font-medium">{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <motion.button
                    type="submit"
                    className="w-full mt-6 relative group"
                    disabled={userInput.length !== 6}
                    whileHover={{ scale: userInput.length === 6 ? 1.02 : 1 }}
                    whileTap={{ scale: userInput.length === 6 ? 0.98 : 1 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
                    <div className={`relative py-4 px-6 rounded-xl font-semibold shadow-lg transition-all ${
                      userInput.length === 6
                        ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-orange-600/30'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}>
                      Verify & Continue
                    </div>
                  </motion.button>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="size-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle className="size-12 text-green-600" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Verification Successful!</h3>
                  <p className="text-slate-600">Redirecting you now...</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Back Button */}
            {!success && (
              <motion.button
                onClick={onBack}
                className="w-full mt-6 py-3 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Back to Login
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
