import { createConnection } from 'typeorm';

createConnection().catch(err => {
    console.log(err);
});
