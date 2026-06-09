const fs = require('fs');
const file = 'src/lib/handlers/api-router.ts';
let content = fs.readFileSync(file, 'utf8');

// Find the createDriver function body and replace the validation + body
// The old code requires name+email+license_no always
// We need to add a branch: if user_id is provided, skip user creation

const marker = 'async function createDriver(req: NextRequest, pool: import("pg").Pool) {';
const idx = content.indexOf(marker);
if (idx === -1) {
  console.error('ERROR: createDriver function not found');
  process.exit(1);
}

// Find the end of the function (matching closing brace)
let braceCount = 0;
let funcStart = idx;
let funcEnd = -1;
for (let i = idx; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  else if (content[i] === '}') {
    braceCount--;
    if (braceCount === 0) {
      funcEnd = i + 1;
      break;
    }
  }
}

if (funcEnd === -1) {
  console.error('ERROR: could not find end of createDriver function');
  process.exit(1);
}

const oldFunc = content.substring(funcStart, funcEnd);
console.log('Old function length:', oldFunc.length);

const newFunc = `async function createDriver(req: NextRequest, pool: import("pg").Pool) {
  const body = await req.json().catch(() => null);
  // Support two modes:
  // 1. New: body has user_id (links an existing user to a driver profile)
  // 2. Legacy: body has name + email (creates a new user + driver profile)
  if (body?.user_id) {
    if (!body.license_no) return badRequest("license_no is required");
    const client2 = await pool.connect();
    try {
      await client2.query("BEGIN");
      const dRes2 = await client2.query(
        \`INSERT INTO driver_profiles (user_id, license_no, license_class, issue_date, expiry_date, endorsements, contact_phone)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING driver_id\`,
        [
          body.user_id,
          body.license_no,
          body.license_class || "B",
          body.issue_date,
          body.expiry_date,
          body.endorsements ?? "",
          (body.contact_phone ?? "").trim(),
        ]
      );
      await client2.query("COMMIT");
      const driver2 = await fetchDriver(pool, dRes2.rows[0].driver_id);
      return created(driver2);
    } catch (e) {
      await client2.query("ROLLBACK");
      throw e;
    } finally {
      client2.release();
    }
  }
  if (!body?.name || !body?.email || !body?.license_no) return badRequest("name, email, and license_no are required");
  const password = body.password || "driver123";
  const hash = await bcrypt.hash(password, 10);
  const locId = optionalUUID(body.location_id);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const uRes = await client.query(
      \`INSERT INTO users (name, email, role, password_hash, location_id) VALUES ($1,$2,'driver',$3,$4) RETURNING user_id\`,
      [body.name, String(body.email).toLowerCase(), hash, locId]
    );
    const uid = uRes.rows[0].user_id;
    const dRes = await client.query(
      \`INSERT INTO driver_profiles (user_id, license_no, license_class, issue_date, expiry_date, endorsements, contact_phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING driver_id\`,
      [
        uid,
        body.license_no,
        body.license_class || "B",
        body.issue_date,
        body.expiry_date,
        body.endorsements ?? "",
        (body.contact_phone ?? "").trim(),
      ]
    );
    await client.query("COMMIT");
    const driver = await fetchDriver(pool, dRes.rows[0].driver_id);
    return created(driver);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}`;

const newContent = content.substring(0, funcStart) + newFunc + content.substring(funcEnd);
fs.writeFileSync(file, newContent, 'utf8');
console.log('SUCCESS: createDriver patched with user_id support');
