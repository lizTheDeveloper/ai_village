import actionDefinitionsData from './data/action-definitions.json' assert { type: 'json' };
import skillContextsData from './data/skill-contexts.json' assert { type: 'json' };
import modelProfilesData from './data/model-profiles.json' assert { type: 'json' };
import personalityVariationsData from './data/personality-variations.json' assert { type: 'json' };
import deityTemplatesData from './data/deity-interface-templates.json' assert { type: 'json' };

console.log('✓ action-definitions.json: ', actionDefinitionsData.actions.length, 'actions');
console.log('✓ skill-contexts.json:', Object.keys(skillContextsData.skills).length, 'skills');
console.log('✓ model-profiles.json:', modelProfilesData.profiles.length, 'profiles');
console.log('✓ personality-variations.json:', Object.keys(personalityVariationsData).length, 'traits');
console.log('✓ deity-interface-templates.json:', Object.keys(deityTemplatesData.interfaces).length, 'interfaces');
console.log('\n✅ All JSON files load correctly!');
