import { Database } from "bun:sqlite";

const db = new Database("./src/lib/persistence.sqlite");
db.run('DROP TABLE IF EXISTS posts');
db.run('DROP TABLE IF EXISTS comments');
console.log('Complete')
db.close()