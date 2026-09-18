// ===== Multi-Language Preset Data =====
            const DEFAULTS = {
                Tablet: {
                    'mr-IN': [
                        { id: 'tab-mr-1', label: '1 गोळी रोज सकाळी उपाशीपोटी', m: true, a: false, n: false, food: 'Before' },
                        { id: 'tab-mr-2', label: '1 गोळी रोज सकाळी नाष्ट्या आधी', m: true, a: false, n: false, food: 'Before' },
                        { id: 'tab-mr-3', label: '1 गोळी सकाळी नाष्ट्याआधी व संध्याकाळी जेवणाच्या आधी', m: true, a: false, n: true, food: 'Before' },
                        { id: 'tab-mr-4', label: '1 गोळी सकाळी नाष्ट्यानंतर', m: true, a: false, n: false, food: 'After' },
                        { id: 'tab-mr-5', label: '1 गोळी सकाळी नाष्ट्यानंतर व 1 गोळी रात्री जेवणानंतर', m: true, a: false, n: true, food: 'After' },
                        { id: 'tab-mr-6', label: '1 गोळी सकाळी, दुपारी, रात्री जेवणानंतर', m: true, a: true, n: true, food: 'After' },
                        { id: 'tab-mr-7', label: '1 गोळी दुपारी जेवणानंतर', m: false, a: true, n: false, food: 'After' },
                        { id: 'tab-mr-8', label: '1 गोळी दुपारी जेवणाच्या आधी', m: false, a: true, n: false, food: 'Before' },
                        { id: 'tab-mr-9', label: '1 गोळी रात्री जेवणानंतर', m: false, a: false, n: true, food: 'After' },
                        { id: 'tab-mr-10', label: '1 गोळी रात्री जेवणाच्या आधी', m: false, a: false, n: true, food: 'Before' },
                        { id: "tab-mr-11", label: "1 गोळी दुपारी जेवणाआधी व एक गोळी रात्री जेवणाआधी", m: false, a: false, n: false, food: "Before" },  // New entry
                        { id: "tab-mr-12", label: "1/2 गोळी दुपारी जेवणाआधी व एक गोळी रात्री जेवणाआधी", m: false, a: false, n: false, food: "Before" },  // New entry

                        { id: 'tab-mr-13', label: '½ गोळी रोज सकाळी उपाशीपोटी', m: true, a: false, n: false, food: 'Before' },
                        { id: 'tab-mr-14', label: '½ गोळी सकाळी नाष्ट्याआधी व संध्याकाळी जेवणाच्या आधी', m: true, a: false, n: true, food: 'Before' },
                        { id: 'tab-mr-15', label: '½ गोळी सकाळी नाष्ट्यानंतर', m: true, a: false, n: false, food: 'After' },
                        { id: 'tab-mr-16', label: '½ गोळी सकाळी नाष्ट्यानंतर व ½ गोळी रात्री जेवणानंतर', m: true, a: false, n: true, food: 'After' },
                        { id: 'tab-mr-17', label: '½ गोळी सकाळी, दुपारी, रात्री जेवणानंतर', m: true, a: true, n: true, food: 'After' },
                        { id: 'tab-mr-18', label: '½ गोळी दुपारी जेवणानंतर', m: false, a: true, n: false, food: 'After' },
                        { id: 'tab-mr-19', label: '½ गोळी दुपारी जेवणाच्या आधी', m: false, a: true, n: false, food: 'Before' },
                        { id: 'tab-mr-20', label: '½ गोळी रात्री जेवणानंतर', m: false, a: false, n: true, food: 'After' },
                        { id: 'tab-mr-21', label: '½ गोळी रात्री जेवणाच्या आधी', m: false, a: false, n: true, food: 'Before' }
                    ],
                    'en-IN': [
                        // 1 tablet instructions
                        { id: 'tab-en-1', label: '1 tablet daily morning on empty stomach', m: true, a: false, n: false, food: 'Before' },
                        { id: 'tab-en-2', label: '1 tablet daily before breakfast', m: true, a: false, n: false, food: 'Before' },
                        { id: 'tab-en-3', label: '1 tablet morning before breakfast & evening before dinner', m: true, a: false, n: true, food: 'Before' },
                        { id: 'tab-en-4', label: '1 tablet in the morning after breakfast', m: true, a: false, n: false, food: 'After' },
                        { id: 'tab-en-5', label: '1 tablet after breakfast & 1 tablet after dinner', m: true, a: false, n: true, food: 'After' },
                        { id: 'tab-en-6', label: '1 tablet morning, afternoon, & night after meals', m: true, a: true, n: true, food: 'After' },
                        { id: 'tab-en-7', label: '1 tablet in the afternoon after lunch', m: false, a: true, n: false, food: 'After' },
                        { id: 'tab-en-8', label: '1 tablet in the afternoon before lunch', m: false, a: true, n: false, food: 'Before' },
                        { id: 'tab-en-9', label: '1 tablet at night after dinner', m: false, a: false, n: true, food: 'After' },
                        { id: 'tab-en-10', label: '1 tablet at night before dinner', m: false, a: false, n: true, food: 'Before' },
                        { id: "tab-en-11", label: "1 tablet before lunch and 1 tablet before dinner", m: false, a: false, n: false, food: "Before" },  // New entry
                        { id: "tab-en-12", label: "1/2 tablet before lunch and 1 tablet before dinner", m: false, a: false, n: false, food: "Before" },  // New entry

                        // ½ tablet instructions
                        { id: 'tab-en-13', label: '½ tablet daily morning on empty stomach', m: true, a: false, n: false, food: 'Before' },
                        { id: 'tab-en-14', label: '½ tablet morning before breakfast & evening before dinner', m: true, a: false, n: true, food: 'Before' },
                        { id: 'tab-en-15', label: '½ tablet in the morning after breakfast', m: true, a: false, n: false, food: 'After' },
                        { id: 'tab-en-16', label: '½ tablet after breakfast & ½ tablet after dinner', m: true, a: false, n: true, food: 'After' },
                        { id: 'tab-en-17', label: '½ tablet morning, afternoon, & night after meals', m: true, a: true, n: true, food: 'After' },
                        { id: 'tab-en-18', label: '½ tablet in the afternoon after lunch', m: false, a: true, n: false, food: 'After' },
                        { id: 'tab-en-19', label: '½ tablet in the afternoon before lunch', m: false, a: true, n: false, food: 'Before' },
                        { id: 'tab-en-20', label: '½ tablet at night after dinner', m: false, a: false, n: true, food: 'After' },
                        { id: 'tab-en-21', label: '½ tablet at night before dinner', m: false, a: false, n: true, food: 'Before' }
                    ],

                    'hi-IN': [
                        // 1 गोली instructions
                        { id: 'tab-hi-1', label: '1 गोली रोज़ सुबह खाली पेट', m: true, a: false, n: false, food: 'Before' },
                        { id: 'tab-hi-2', label: '1 गोली सुबह नाश्ते से पहले', m: true, a: false, n: false, food: 'Before' },
                        { id: 'tab-hi-3', label: '1 गोली सुबह नाश्ते से पहले और शाम को खाने से पहले', m: true, a: false, n: true, food: 'Before' },
                        { id: 'tab-hi-4', label: '1 गोली सुबह नाश्ते के बाद', m: true, a: false, n: false, food: 'After' },
                        { id: 'tab-hi-5', label: '1 गोली सुबह नाश्ते के बाद और 1 गोली रात को खाने के बाद', m: true, a: false, n: true, food: 'After' },
                        { id: 'tab-hi-6', label: '1 गोली सुबह, दोपहर, रात खाने के बाद', m: true, a: true, n: true, food: 'After' },
                        { id: 'tab-hi-7', label: '1 गोली दोपहर में भोजन के बाद', m: false, a: true, n: false, food: 'After' },
                        { id: 'tab-hi-8', label: '1 गोली दोपहर में भोजन से पहले', m: false, a: true, n: false, food: 'Before' },
                        { id: 'tab-hi-9', label: '1 गोली रात में खाने के बाद', m: false, a: false, n: true, food: 'After' },
                        { id: 'tab-hi-10', label: '1 गोली रात में खाने से पहले', m: false, a: false, n: true, food: 'Before' },
                        { id: "tab-hi-11", label: "1 गोली दोपहर में खाने से पहले और एक गोली रात में खाने से पहले", m: false, a: false, n: false, food: "Before" },  // New entry
                        { id: "tab-hi-12", label: "1/2 गोली दोपहर में खाने से पहले और एक गोली रात में खाने से पहले", m: false, a: false, n: false, food: "Before" },  // New entry

                        // ½ गोली instructions
                        { id: 'tab-hi-13', label: '½ गोली रोज़ सुबह खाली पेट', m: true, a: false, n: false, food: 'Before' },
                        { id: 'tab-hi-14', label: '½ गोली सुबह नाश्ते से पहले और शाम को खाने से पहले', m: true, a: false, n: true, food: 'Before' },
                        { id: 'tab-hi-15', label: '½ गोली सुबह नाश्ते के बाद', m: true, a: false, n: false, food: 'After' },
                        { id: 'tab-hi-16', label: '½ गोली सुबह नाश्ते के बाद और ½ गोली रात को खाने के बाद', m: true, a: false, n: true, food: 'After' },
                        { id: 'tab-hi-17', label: '½ गोली सुबह, दोपहर, रात खाने के बाद', m: true, a: true, n: true, food: 'After' },
                        { id: 'tab-hi-18', label: '½ गोली दोपहर में भोजन के बाद', m: false, a: true, n: false, food: 'After' },
                        { id: 'tab-hi-19', label: '½ गोली दोपहर में भोजन से पहले', m: false, a: true, n: false, food: 'Before' },
                        { id: 'tab-hi-20', label: '½ गोली रात में खाने के बाद', m: false, a: false, n: true, food: 'After' },
                        { id: 'tab-hi-21', label: '½ गोली रात में खाने से पहले', m: false, a: false, n: true, food: 'Before' }
                    ]

                },
                Capsule: {
                    'mr-IN': [
                        { id: 'cap-mr-1', label: '1 कॅप्सूल रोज सकाळी उपाशीपोटी', m: true, a: false, n: false, food: 'Before' },
                        { id: 'cap-mr-2', label: '1 कॅप्सूल सकाळी नाष्ट्याआधी व संध्याकाळी जेवणाच्या आधी', m: true, a: false, n: true, food: 'Before' },
                        { id: 'cap-mr-3', label: '1 कॅप्सूल सकाळी नाष्ट्यानंतर', m: true, a: false, n: false, food: 'After' },
                        { id: 'cap-mr-4', label: '1 कॅप्सूल सकाळी नाष्ट्यानंतर व 1 कॅप्सूल रात्री जेवणानंतर', m: true, a: false, n: true, food: 'After' },
                        { id: 'cap-mr-5', label: '1 कॅप्सूल सकाळी, दुपारी, रात्री जेवणानंतर', m: true, a: true, n: true, food: 'After' },
                        { id: 'cap-mr-6', label: '1 कॅप्सूल दुपारी जेवणानंतर', m: false, a: true, n: false, food: 'After' },
                        { id: 'cap-mr-7', label: '1 कॅप्सूल दुपारी जेवणाच्या आधी', m: false, a: true, n: false, food: 'Before' },
                        { id: 'cap-mr-8', label: '1 कॅप्सूल रात्री जेवणानंतर', m: false, a: false, n: true, food: 'After' },
                        { id: 'cap-mr-9', label: '1 कॅप्सूल रात्री जेवणाच्या आधी', m: false, a: false, n: true, food: 'Before' }
                    ],
                    'en-IN': [
                        { id: 'cap-en-1', label: '1 capsule daily morning on empty stomach', m: true, a: false, n: false, food: 'Before' },
                        { id: 'cap-en-2', label: '1 capsule morning before breakfast & evening before dinner', m: true, a: false, n: true, food: 'Before' },
                        { id: 'cap-en-3', label: '1 capsule in the morning after breakfast', m: true, a: false, n: false, food: 'After' },
                        { id: 'cap-en-4', label: '1 capsule after breakfast & 1 capsule after dinner', m: true, a: false, n: true, food: 'After' },
                        { id: 'cap-en-5', label: '1 capsule morning, afternoon, & night after meals', m: true, a: true, n: true, food: 'After' },
                        { id: 'cap-en-6', label: '1 capsule in the afternoon after lunch', m: false, a: true, n: false, food: 'After' },
                        { id: 'cap-en-7', label: '1 capsule in the afternoon before lunch', m: false, a: true, n: false, food: 'Before' },
                        { id: 'cap-en-8', label: '1 capsule at night after dinner', m: false, a: false, n: true, food: 'After' },
                        { id: 'cap-en-9', label: '1 capsule at night before dinner', m: false, a: false, n: true, food: 'Before' }
                    ],
                    'hi-IN': [
                        { id: 'cap-hi-1', label: '1 कैप्सूल रोज़ सुबह खाली पेट', m: true, a: false, n: false, food: 'Before' },
                        { id: 'cap-hi-2', label: '1 कैप्सूल सुबह नाश्ते से पहले और शाम को खाने से पहले', m: true, a: false, n: true, food: 'Before' },
                        { id: 'cap-hi-3', label: '1 कैप्सूल सुबह नाश्ते के बाद', m: true, a: false, n: false, food: 'After' },
                        { id: 'cap-hi-4', label: '1 कैप्सूल सुबह नाश्ते के बाद और 1 कैप्सूल रात को खाने के बाद', m: true, a: false, n: true, food: 'After' },
                        { id: 'cap-hi-5', label: '1 कैप्सूल सुबह, दोपहर, रात खाने के बाद', m: true, a: true, n: true, food: 'After' },
                        { id: 'cap-hi-6', label: '1 कैप्सूल दोपहर में भोजन के बाद', m: false, a: true, n: false, food: 'After' },
                        { id: 'cap-hi-7', label: '1 कैप्सूल दोपहर में भोजन से पहले', m: false, a: true, n: false, food: 'Before' },
                        { id: 'cap-hi-8', label: '1 कैप्सूल रात में खाने के बाद', m: false, a: false, n: true, food: 'After' },
                        { id: 'cap-hi-9', label: '1 कैप्सूल रात में खाने से पहले', m: false, a: false, n: true, food: 'Before' }
                    ]
                },
                Syrup: {
                    'mr-IN': [], 'en-IN': [], 'hi-IN': [] // Populated below
                },
                // NEW: presets for the "-" type
                "-": {
                    "mr-IN": [
                        { id: "misc-mr-1", label: "1-1 थेंब डोळ्यात दिवसातून चार वेळा", m: true, a: true, n: true, food: "After" },
                        { id: "misc-mr-2", label: "1-1 स्प्रे प्रत्येक नाकपुडीत एक दिवस आड", m: false, a: false, n: false, food: "After" },
                        { id: "misc-mr-3", label: "एक पुडी एक लिटर पाण्यातून विरघळून घेणे", m: false, a: false, n: false, food: "After" },
                        { id: "misc-mr-4", label: "1 कैप दर सोमवारी दुधाबरोबर", m: false, a: false, n: false, food: "After" },
                        { id: "misc-mr-5", label: "1 गोळी ताप असल्यास", m: false, a: false, n: false, food: "After" },
                        { id: "misc-mr-6", label: "1/2 गोळी ताप असल्यास", m: false, a: false, n: false, food: "After" },
                        { id: "misc-mr-7", label: "5 ml ताप असल्यास", m: false, a: false, n: false, food: "After" },
                        { id: "misc-mr-8", label: "2.5 ml ताप असल्यास", m: false, a: false, n: false, food: "After" },
                        { id: "misc-mr-9", label: "1 गोळी नाष्ट्यानंतर चघळणे", m: false, a: false, n: false, food: "After" },  // New entry
                        { id: "misc-mr-10", label: "1 गोळी नाश्त्याच्या आधी ,दुपारी जेवणाच्या आधी व रात्री जेवणाच्या आधी चघळणे", m: false, a: false, n: false, food: "Before" }  // New entry
                    ],
                    "hi-IN": [
                        { id: "misc-hi-1", label: "1-1 बूंद दोनो आखो में 4 बार", m: true, a: true, n: true, food: "After" },
                        { id: "misc-hi-2", label: "1-1 स्प्रे दोनों नाक में एक दिन छोड़कर", m: false, a: false, n: false, food: "After" },
                        { id: "misc-hi-3", label: "एक पुड़िया एक लीटर पानी में घोलकर लें", m: false, a: false, n: false, food: "After" },
                        { id: "misc-hi-4", label: "हर सोमवार 1 कैप दूध के साथ लें", m: false, a: false, n: false, food: "After" },
                        { id: "misc-hi-5", label: "1 गोली बुखार होने पर", m: false, a: false, n: false, food: "After" },
                        { id: "misc-hi-6", label: "1/2 गोली बुखार होने पर", m: false, a: false, n: false, food: "After" },
                        { id: "misc-hi-7", label: "5 ml बुखार होने पर", m: false, a: false, n: false, food: "After" },
                        { id: "misc-hi-8", label: "2.5 ml बुखार होने पर", m: false, a: false, n: false, food: "After" },
                        { id: "misc-hi-9", label: "1 गोली नाश्ते के बाद चबाएं", m: false, a: false, n: false, food: "After" },  // New entry
                        { id: "misc-hi-10", label: "1 गोली नाश्ते के पहले , दोपहर के खाने के पहले और रात के खाने के पहले चबाएं", m: false, a: false, n: false, food: "Before" }  // New entry
                    ],
                    "en-IN": [
                        { id: "misc-en-1", label: "1-1 drop in each eye 4 times a day", m: true, a: true, n: true, food: "After" },
                        { id: "misc-en-2", label: "1-1 spray in each nostril — alternate days", m: false, a: false, n: false, food: "After" },
                        { id: "misc-en-3", label: "Dissolve one sachet in 1 litre of water and take", m: false, a: false, n: false, food: "After" },
                        { id: "misc-en-4", label: "Take 1 cap every Monday with milk", m: false, a: false, n: false, food: "After" },
                        { id: "misc-en-5", label: "1 tablet in case of fever", m: false, a: false, n: false, food: "After" },
                        { id: "misc-en-6", label: "1/2 tablet in case of fever", m: false, a: false, n: false, food: "After" },
                        { id: "misc-en-7", label: "5 ml in case of fever", m: false, a: false, n: false, food: "After" },
                        { id: "misc-en-8", label: "2.5 ml in case of fever", m: false, a: false, n: false, food: "After" },
                        { id: "misc-en-9", label: "1 tablet after breakfast", m: false, a: false, n: false, food: "After" },  // New entry
                        { id: "misc-en-10", label: "1 tablet before breakfast, before lunch, and before dinner", m: false, a: false, n: false, food: "Before" }  // New entry
                    ]
                },
                Cream: {
                    "mr-IN": [
                        { id: "crm-mr-1", label: "दोन वेळा लावणे", m: true, a: false, n: true, food: "After" }
                    ],
                    "hi-IN": [
                        { id: "crm-hi-1", label: "दिन में दो बार लगाएं", m: true, a: false, n: true, food: "After" }
                    ],
                    "en-IN": [
                        { id: "crm-en-1", label: "Apply twice daily", m: true, a: false, n: true, food: "After" }
                    ]
                },
                Ointment: {
                    "mr-IN": [
                        { id: "orm-mr-1", label: "दोन वेळा लावणे", m: true, a: false, n: true, food: "After" }
                    ],
                    "hi-IN": [
                        { id: "orm-hi-1", label: "दिन में दो बार लगाएं", m: true, a: false, n: true, food: "After" }
                    ],
                    "en-IN": [
                        { id: "orm-en-1", label: "Apply twice daily", m: true, a: false, n: true, food: "After" }
                    ]
                },
            };

            module.exports = DEFAULTS;