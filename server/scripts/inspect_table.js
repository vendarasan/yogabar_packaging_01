'use strict';
require('dotenv').config();
const { query } = require('../db');

async function inspect() {
  const r = await query("SELECT id, fg_code, project_name, stage, status, brief_date, milestones FROM projects");
  console.log(JSON.stringify(r.rows, null, 2));
  process.exit(0);
}

inspect();
