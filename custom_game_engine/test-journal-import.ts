import { JournalComponent } from './packages/core/src/components/JournalComponent';

console.log('JournalComponent:', JournalComponent);
console.log('Is undefined?', JournalComponent === undefined);

const instance = new JournalComponent({});
console.log('Instance:', instance);
console.log('Instance type:', instance.type);
