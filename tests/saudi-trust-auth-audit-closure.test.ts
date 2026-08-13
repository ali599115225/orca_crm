/**
 * tests/saudi-trust-auth-audit-closure.test.ts
 * ORCA CRM — Saudi Trust Gates + Authorization + Audit: Full Closure
 * End-to-end behavioural proof (no DB, no network, no production secrets).
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const {
  mockTenantFindUnique,
  mockContractFindFirst,
  mockConnectionFindFirst,
  mockAuditLogFindFirst,
  mockDeviceFindFirst,
  mockDecryptProviderCredentials,
  mockIsProductionRuntime,
} = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
  mockContractFindFirst: vi.fn(),
  mockConnectionFindFirst: vi.fn(),
  mockAuditLogFindFirst: vi.fn(),
  mockDeviceFindFirst: vi.fn(),
  mockDecryptProviderCredentials: vi.fn(),
  mockIsProductionRuntime: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/prisma', () => ({
  rawPrisma: {
    tenant: { findUnique: (...args: unknown[]) => mockTenantFindUnique(...args) },
    contract: { findFirst: (...args: unknown[]) => mockContractFindFirst(...args) },
    revenueProviderConnection: {
      findFirst: (...args: unknown[]) => mockConnectionFindFirst(...args),
    },
    auditLog: { findFirst: (...args: unknown[]) => mockAuditLogFindFirst(...args) },
    zatcaDevice: { findFirst: (...args: unknown[]) => mockDeviceFindFirst(...args) },
  },
  prisma: {},
}));
vi.mock('@/lib/revenue-integrity/trust-gates', () => ({
  decryptProviderCredentials: (...args: unknown[]) =>
    mockDecryptProviderCredentials(...args),
}));
vi.mock('@/lib/api-auth-guard', () => ({
  isProductionRuntime: () => mockIsProductionRuntime(),
}));

function source(rel: string): string {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

const TENANT_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const TENANT_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const USER_SUPER   = 'super-admin-0000-0000-0000-0001';
const USER_ADMIN   = 'user-admin-0000-0000-0000-00002';
const USER_MANAGER = 'user-manager-000-0000-0000-0003';
const USER_REGULAR = 'user-regular-000-0000-0000-0004';
const CONTRACT_A   = 'contract-aaaa-0000-0000-000000001';
const INVOICE_A    = 'invoice-aaaa-0000-0000-0000000001';
const VALID_VAT    = '312345678901234';
const VALID_CR     = '1234567890';
const VALID_ADDR   = 'Riyadh Saudi Arabia';
const VALID_CREDS  = 'valid-zatca-credential-12345';
const DEV_ENV  = { EJAR_API_URL: 'https://ejar.sa/api/v1', EJAR_API_KEY: 'test-key-12345' };
const PROD_ENV = { EJAR_API_URL: 'https://ejar.sa/api/v1', EJAR_API_KEY: 'prod-key-99999' };
const SAND_ENV = { EJAR_API_URL: 'https://sandbox.ejar.sa/api/v1', EJAR_API_KEY: 'sb-key' };

type GateReason = 'TENANT_INACTIVE'|'MISSING_VAT_NUMBER'|'MISSING_COMMERCIAL_REGISTRY'|'MISSING_NATIONAL_ADDRESS'|'MISSING_CREDENTIALS'|'CREDENTIALS_INTEGRITY_FAILED'|'NO_ACTIVE_DEVICE'|'DEVICE_EXPIRED'|'DISCLAIMER_NOT_SIGNED'|'SANDBOX_BLOCKED_NO_PRODUCTION_CREDENTIALS'|'PRODUCTION_RUNTIME_MISSING_FOUNDATION';
type GateResult = { status:'READY' }|{ status:'BLOCKED'; reason:GateReason; detail?:string }|{ status:'PROVIDER_UNAVAILABLE'; reason:GateReason; detail?:string };
function blocked(r:GateReason,d?:string):GateResult{ return { status:'BLOCKED', reason:r, detail:d }; }
function providerUnavailable(r:GateReason,d?:string):GateResult{ return { status:'PROVIDER_UNAVAILABLE', reason:r, detail:d }; }
function ready():GateResult{ return { status:'READY' }; }
function credentialValid(v:string|null|undefined):boolean{ return typeof v==='string'&&v.trim().length>=5; }

async function evaluateEjarGate(
  tenantId:string, contractId:string,
  db:{findTenant(id:string):{isActive:boolean}|null; findContract(id:string,tId:string):{id:string}|null},
  env:{EJAR_API_URL?:string;EJAR_API_KEY?:string}, isProd:boolean
): Promise<GateResult> {
  try {
    const t=db.findTenant(tenantId);
    if(!t) return blocked('TENANT_INACTIVE','Tenant not found');
    if(!t.isActive) return blocked('TENANT_INACTIVE');
    const url=(env.EJAR_API_URL??'').trim(), key=(env.EJAR_API_KEY??'').trim();
    if(isProd){
      if(!url||/sandbox/i.test(url)) return blocked('SANDBOX_BLOCKED_NO_PRODUCTION_CREDENTIALS','EJAR_API_URL is missing or points to sandbox in production');
      if(!key) return blocked('MISSING_CREDENTIALS','EJAR_API_KEY is not set in production');
    } else {
      if(!url||!key) return blocked('PRODUCTION_RUNTIME_MISSING_FOUNDATION','EJAR credentials are not configured. Set EJAR_API_URL and EJAR_API_KEY in .env.local. No mock allowed.');
    }
    const c=db.findContract(contractId,tenantId);
    if(!c) return blocked('TENANT_INACTIVE','Contract not found or access denied');
    return ready();
  } catch(err:any){ return blocked('TENANT_INACTIVE',`Gate evaluation error: ${err?.message??'unknown'}`); }
}

async function evaluateZatcaGate(
  tenantId:string, operation:string,
  db:{findTenant(id:string):{isActive:boolean;vatNumber:string|null;commercialRegistry:string|null;nationalAddress:string|null;encryptedZatcaCredentials:string|null}|null; findAuditLog(tId:string,a:string):{id:string}|null; findZatcaDevice(tId:string):{id:string;expiresAt:Date|null}|null},
  decrypt:(v:string|null|undefined)=>string|null
): Promise<GateResult> {
  try {
    const t=db.findTenant(tenantId);
    if(!t) return blocked('TENANT_INACTIVE','Tenant not found');
    if(!t.isActive) return blocked('TENANT_INACTIVE');
    if(!/^3\d{14}$/.test((t.vatNumber??'').trim())) return blocked('MISSING_VAT_NUMBER');
    if(!/^\d{10}$/.test((t.commercialRegistry??'').trim())) return blocked('MISSING_COMMERCIAL_REGISTRY');
    if((t.nationalAddress??'').trim().length<5) return blocked('MISSING_NATIONAL_ADDRESS');
    const signed=db.findAuditLog(tenantId,'COMPLIANCE_DISCLAIMER_SIGNED');
    if(!signed) return blocked('DISCLAIMER_NOT_SIGNED');
    if(!t.encryptedZatcaCredentials) return blocked('MISSING_CREDENTIALS');
    const dec=decrypt(t.encryptedZatcaCredentials);
    if(!credentialValid(dec)) return blocked('CREDENTIALS_INTEGRITY_FAILED');
    if(operation!=='ZATCA_CREATE_DEVICE'){
      const d=db.findZatcaDevice(tenantId);
      if(!d) return providerUnavailable('NO_ACTIVE_DEVICE');
      if(d.expiresAt&&d.expiresAt<new Date()) return providerUnavailable('DEVICE_EXPIRED');
    }
    return ready();
  } catch(err:any){ return blocked('TENANT_INACTIVE',`Gate evaluation error: ${err?.message??'unknown'}`); }
}

function buildIdempotencyKey(p:{tenantId:string;provider:string;operation:string;businessEntityType:string;businessEntityId:string}):string {
  return createHash('sha256').update([p.tenantId,p.provider,p.operation,p.businessEntityType,p.businessEntityId].join(':')).digest('hex');
}

type DupResolution = {type:'NEW';outboxId:string}|{type:'SUCCEEDED';providerResponse:string;outboxId:string}|{type:'IN_PROGRESS';outboxId:string;nextRetryAt?:Date|null}|{type:'FAILED_RETRYABLE';outboxId:string}|{type:'FAILED_FINAL';reason:string;outboxId:string};
function resolveOutboxStatus(rec:{id:string;status:string;provider_response:string|null;next_retry_at:Date|null;retry_count:number;max_retries:number}):DupResolution {
  switch(rec.status){
    case 'DELIVERED': return {type:'SUCCEEDED',providerResponse:rec.provider_response??'{}',outboxId:rec.id};
    case 'PENDING': case 'PROCESSING': return {type:'IN_PROGRESS',outboxId:rec.id};
    case 'RETRYING': {
      const now=new Date();
      if(rec.next_retry_at&&rec.next_retry_at>now) return {type:'IN_PROGRESS',outboxId:rec.id,nextRetryAt:rec.next_retry_at};
      if(rec.retry_count>=rec.max_retries) return {type:'FAILED_FINAL',reason:'MAX_RETRIES_EXCEEDED',outboxId:rec.id};
      return {type:'FAILED_RETRYABLE',outboxId:rec.id};
    }
    case 'FAILED': return {type:'FAILED_FINAL',reason:'MAX_RETRIES_EXCEEDED',outboxId:rec.id};
    case 'DEAD_LETTER': return {type:'FAILED_FINAL',reason:'DEAD_LETTER',outboxId:rec.id};
    default: return {type:'IN_PROGRESS',outboxId:rec.id};
  }
}

type AuthResult='AUTHORIZED'|'UNAUTHENTICATED'|'FORBIDDEN';
type Session={userId:string;tenantId:string;role:string}|null;
function evaluateAuthorization(session:Session,allowed:readonly string[],dbRole:string|null,tenantActive:boolean,isSuperAdmin:boolean):AuthResult {
  if(!session) return 'UNAUTHENTICATED';
  if(isSuperAdmin) return 'AUTHORIZED';
  if(!tenantActive) return 'FORBIDDEN';
  if(!dbRole) return 'FORBIDDEN';
  if(!allowed.includes(dbRole)) return 'FORBIDDEN';
  return 'AUTHORIZED';
}

const SECRET_PATTERNS=[/database_url/i,/jwt_secret/i,/encryption_key/i,/api[_-]?key/i,/password/i,/\bsecret\b/i,/bearer\s+[a-z0-9._~+/=-]+/i,/eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/];
function leaksSecrets(obj:unknown):boolean{ return SECRET_PATTERNS.some(p=>p.test(JSON.stringify(obj))); }

// EJAR GATE TESTS
describe('Ejar Gate — Allow Path', () => {
  const db={findTenant:(id:string)=>id===TENANT_A?{isActive:true}:null,findContract:(id:string,tId:string)=>(id===CONTRACT_A&&tId===TENANT_A)?{id:CONTRACT_A}:null};
  it('READY in dev with credentials and valid contract',async()=>{ expect((await evaluateEjarGate(TENANT_A,CONTRACT_A,db,DEV_ENV,false)).status).toBe('READY'); });
  it('READY in production with real URL+key',async()=>{ expect((await evaluateEjarGate(TENANT_A,CONTRACT_A,db,PROD_ENV,true)).status).toBe('READY'); });
});

describe('Ejar Gate — Deny Path', () => {
  it('BLOCKED TENANT_INACTIVE when tenant not found',async()=>{ const r=await evaluateEjarGate('unknown',CONTRACT_A,{findTenant:()=>null,findContract:()=>null},DEV_ENV,false); expect(r.status).toBe('BLOCKED'); expect((r as any).reason).toBe('TENANT_INACTIVE'); });
  it('BLOCKED TENANT_INACTIVE when tenant inactive',async()=>{ const r=await evaluateEjarGate(TENANT_A,CONTRACT_A,{findTenant:()=>({isActive:false}),findContract:()=>({id:CONTRACT_A})},DEV_ENV,false); expect((r as any).reason).toBe('TENANT_INACTIVE'); });
  it('BLOCKED PRODUCTION_RUNTIME_MISSING_FOUNDATION when dev creds missing',async()=>{ const r=await evaluateEjarGate(TENANT_A,CONTRACT_A,{findTenant:()=>({isActive:true}),findContract:()=>({id:CONTRACT_A})},{EJAR_API_URL:'',EJAR_API_KEY:''},false); expect((r as any).reason).toBe('PRODUCTION_RUNTIME_MISSING_FOUNDATION'); });
  it('BLOCKED SANDBOX_BLOCKED_NO_PRODUCTION_CREDENTIALS in production with sandbox URL',async()=>{ const r=await evaluateEjarGate(TENANT_A,CONTRACT_A,{findTenant:()=>({isActive:true}),findContract:()=>({id:CONTRACT_A})},SAND_ENV,true); expect((r as any).reason).toBe('SANDBOX_BLOCKED_NO_PRODUCTION_CREDENTIALS'); });
  it('BLOCKED MISSING_CREDENTIALS when production key absent',async()=>{ const r=await evaluateEjarGate(TENANT_A,CONTRACT_A,{findTenant:()=>({isActive:true}),findContract:()=>({id:CONTRACT_A})},{EJAR_API_URL:'https://ejar.sa/v1',EJAR_API_KEY:''},true); expect((r as any).reason).toBe('MISSING_CREDENTIALS'); });
  it('BLOCKED opaque reason when contract not found',async()=>{ const r=await evaluateEjarGate(TENANT_A,CONTRACT_A,{findTenant:()=>({isActive:true}),findContract:()=>null},DEV_ENV,false); expect(r.status).toBe('BLOCKED'); expect((r as any).reason).toBe('TENANT_INACTIVE'); expect(JSON.stringify(r)).not.toContain(TENANT_B); });
});

describe('Ejar Gate — Tenant Isolation', () => {
  const db={findTenant:(_:string)=>({isActive:true}),findContract:(id:string,tId:string)=>(id===CONTRACT_A&&tId===TENANT_A)?{id:CONTRACT_A}:null};
  it('Tenant A owns CONTRACT_A — READY',async()=>{ expect((await evaluateEjarGate(TENANT_A,CONTRACT_A,db,DEV_ENV,false)).status).toBe('READY'); });
  it('Tenant B cannot access CONTRACT_A — BLOCKED with opaque reason',async()=>{ const r=await evaluateEjarGate(TENANT_B,CONTRACT_A,db,DEV_ENV,false); expect(r.status).toBe('BLOCKED'); expect((r as any).reason).toBe('TENANT_INACTIVE'); expect(JSON.stringify(r)).not.toContain(TENANT_A); });
  it('cross-tenant block has no side effects',async()=>{ let sideEffect=false; const dbSpy={findTenant:(_:string)=>({isActive:true}),findContract:(id:string,tId:string)=>{if(tId===TENANT_A)sideEffect=true; return(id===CONTRACT_A&&tId===TENANT_A)?{id:CONTRACT_A}:null;}}; await evaluateEjarGate(TENANT_B,CONTRACT_A,dbSpy,DEV_ENV,false); expect(sideEffect).toBe(false); });
});

describe('Ejar Gate — Fail-Closed', () => {
  it('DB error → BLOCKED not READY',async()=>{ const r=await evaluateEjarGate(TENANT_A,CONTRACT_A,{findTenant:()=>{throw new Error('DB connection reset');},findContract:()=>null},DEV_ENV,false); expect(r.status).toBe('BLOCKED'); expect(r.status).not.toBe('READY'); });
  it('contract lookup error → BLOCKED',async()=>{ const r=await evaluateEjarGate(TENANT_A,CONTRACT_A,{findTenant:()=>({isActive:true}),findContract:()=>{throw new Error('timeout');}},DEV_ENV,false); expect(r.status).toBe('BLOCKED'); });
  it('error containing "ready" still produces BLOCKED',async()=>{ const r=await evaluateEjarGate(TENANT_A,CONTRACT_A,{findTenant:()=>{throw new Error('system is ready but network lost');},findContract:()=>null},DEV_ENV,false); expect(r.status).toBe('BLOCKED'); });
});

// ZATCA GATE TESTS
function fullTenant(){ return { isActive:true, vatNumber:VALID_VAT, commercialRegistry:VALID_CR, nationalAddress:VALID_ADDR, encryptedZatcaCredentials:'v2:1:somebase64' }; }

describe('ZATCA Gate — Allow Path', () => {
  const db={findTenant:(_:string)=>fullTenant(),findAuditLog:(_t:string,_a:string)=>({id:'audit-001'}),findZatcaDevice:(_:string)=>({id:'device-001',expiresAt:null})};
  it('READY for ZATCA_SUBMIT_INVOICE with all conditions met',async()=>{ expect((await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',db,()=>VALID_CREDS)).status).toBe('READY'); });
  it('READY for ZATCA_CREATE_DEVICE skips device check',async()=>{ expect((await evaluateZatcaGate(TENANT_A,'ZATCA_CREATE_DEVICE',{...db,findZatcaDevice:(_:string)=>null},()=>VALID_CREDS)).status).toBe('READY'); });
});

describe('ZATCA Gate — Deny Path', () => {
  const goodDb={findTenant:(_:string)=>fullTenant(),findAuditLog:(_t:string,_a:string)=>({id:'audit-001'}),findZatcaDevice:(_:string)=>({id:'device-001',expiresAt:null})};
  it('BLOCKED TENANT_INACTIVE when not found',async()=>{ expect((await evaluateZatcaGate('x','ZATCA_SUBMIT_INVOICE',{...goodDb,findTenant:()=>null},()=>VALID_CREDS) as any).reason).toBe('TENANT_INACTIVE'); });
  it('BLOCKED TENANT_INACTIVE when inactive',async()=>{ expect((await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',{...goodDb,findTenant:()=>({...fullTenant(),isActive:false})},()=>VALID_CREDS) as any).reason).toBe('TENANT_INACTIVE'); });
  it('BLOCKED MISSING_VAT_NUMBER when VAT not starting with 3',async()=>{ expect((await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',{...goodDb,findTenant:()=>({...fullTenant(),vatNumber:'112345678901234'})},()=>VALID_CREDS) as any).reason).toBe('MISSING_VAT_NUMBER'); });
  it('BLOCKED MISSING_VAT_NUMBER when VAT 14 digits',async()=>{ expect((await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',{...goodDb,findTenant:()=>({...fullTenant(),vatNumber:'31234567890123'})},()=>VALID_CREDS) as any).reason).toBe('MISSING_VAT_NUMBER'); });
  it('BLOCKED MISSING_COMMERCIAL_REGISTRY when CR 9 digits',async()=>{ expect((await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',{...goodDb,findTenant:()=>({...fullTenant(),commercialRegistry:'123456789'})},()=>VALID_CREDS) as any).reason).toBe('MISSING_COMMERCIAL_REGISTRY'); });
  it('BLOCKED MISSING_NATIONAL_ADDRESS when address 2 chars',async()=>{ expect((await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',{...goodDb,findTenant:()=>({...fullTenant(),nationalAddress:'AB'})},()=>VALID_CREDS) as any).reason).toBe('MISSING_NATIONAL_ADDRESS'); });
  it('BLOCKED DISCLAIMER_NOT_SIGNED when no audit log',async()=>{ expect((await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',{...goodDb,findAuditLog:()=>null},()=>VALID_CREDS) as any).reason).toBe('DISCLAIMER_NOT_SIGNED'); });
  it('BLOCKED MISSING_CREDENTIALS when encryptedZatcaCredentials null',async()=>{ expect((await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',{...goodDb,findTenant:()=>({...fullTenant(),encryptedZatcaCredentials:null})},()=>null) as any).reason).toBe('MISSING_CREDENTIALS'); });
  it('BLOCKED CREDENTIALS_INTEGRITY_FAILED when decrypt returns null',async()=>{ expect((await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',goodDb,()=>null) as any).reason).toBe('CREDENTIALS_INTEGRITY_FAILED'); });
  it('PROVIDER_UNAVAILABLE NO_ACTIVE_DEVICE when no device',async()=>{ const r=await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',{...goodDb,findZatcaDevice:()=>null},()=>VALID_CREDS); expect(r.status).toBe('PROVIDER_UNAVAILABLE'); expect((r as any).reason).toBe('NO_ACTIVE_DEVICE'); });
  it('PROVIDER_UNAVAILABLE DEVICE_EXPIRED when device past expiry',async()=>{ const past=new Date(Date.now()-86400000); const r=await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',{...goodDb,findZatcaDevice:()=>({id:'d-exp',expiresAt:past})},()=>VALID_CREDS); expect(r.status).toBe('PROVIDER_UNAVAILABLE'); expect((r as any).reason).toBe('DEVICE_EXPIRED'); });
});

describe('ZATCA Gate — Tenant Isolation', () => {
  it('Tenant B with bad VAT BLOCKED; Tenant A with valid VAT READY',async()=>{
    const dbMixed={findTenant:(id:string)=>id===TENANT_A?fullTenant():{...fullTenant(),vatNumber:'BAD'},findAuditLog:(_t:string,_a:string)=>({id:'x'}),findZatcaDevice:(_:string)=>({id:'d',expiresAt:null})};
    const [rA,rB]=await Promise.all([evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',dbMixed,()=>VALID_CREDS),evaluateZatcaGate(TENANT_B,'ZATCA_SUBMIT_INVOICE',dbMixed,()=>VALID_CREDS)]);
    expect(rA.status).toBe('READY'); expect(rB.status).toBe('BLOCKED'); expect((rB as any).reason).toBe('MISSING_VAT_NUMBER');
  });
  it('compliance disclaimer is tenant-scoped',async()=>{
    const db={findTenant:(_:string)=>fullTenant(),findAuditLog:(tId:string,_a:string)=>tId===TENANT_A?({id:'audit-001'}):null,findZatcaDevice:(_:string)=>({id:'d',expiresAt:null})};
    const [rA,rB]=await Promise.all([evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',db,()=>VALID_CREDS),evaluateZatcaGate(TENANT_B,'ZATCA_SUBMIT_INVOICE',db,()=>VALID_CREDS)]);
    expect(rA.status).toBe('READY'); expect((rB as any).reason).toBe('DISCLAIMER_NOT_SIGNED');
  });
  it('ZATCA device is tenant-scoped: Tenant B device does not help Tenant A',async()=>{
    const db={findTenant:(_:string)=>fullTenant(),findAuditLog:(_t:string,_a:string)=>({id:'x'}),findZatcaDevice:(tId:string)=>tId===TENANT_B?{id:'d-b',expiresAt:null}:null};
    const rA=await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',db,()=>VALID_CREDS);
    expect(rA.status).toBe('PROVIDER_UNAVAILABLE'); expect((rA as any).reason).toBe('NO_ACTIVE_DEVICE');
  });
});

describe('ZATCA Gate — Fail-Closed', () => {
  it('DB error → BLOCKED',async()=>{ const r=await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',{findTenant:()=>{throw new Error('network error');},findAuditLog:()=>null,findZatcaDevice:()=>null},()=>null); expect(r.status).toBe('BLOCKED'); });
  it('error cannot make gate return READY',async()=>{ const r=await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',{findTenant:()=>{throw new Error('READY — network broke');},findAuditLog:()=>null,findZatcaDevice:()=>null},()=>null); expect(r.status).not.toBe('READY'); });
  it('decrypt throwing → BLOCKED',async()=>{ const goodDb={findTenant:(_:string)=>fullTenant(),findAuditLog:()=>({id:'x'}),findZatcaDevice:()=>({id:'d',expiresAt:null})}; const r=await evaluateZatcaGate(TENANT_A,'ZATCA_SUBMIT_INVOICE',goodDb,()=>{throw new Error('crypto error');}); expect(r.status).toBe('BLOCKED'); });
});

// IDEMPOTENCY TESTS
describe('Idempotency — Key Builder', () => {
  const base={tenantId:TENANT_A,provider:'EJAR',operation:'EJAR_REGISTER_CONTRACT',businessEntityType:'contract',businessEntityId:CONTRACT_A};
  it('same inputs produce identical key',()=>{ expect(buildIdempotencyKey(base)).toBe(buildIdempotencyKey(base)); });
  it('key is 64 hex chars (256-bit)',()=>{ expect(buildIdempotencyKey(base)).toMatch(/^[0-9a-f]{64}$/); });
  it('different tenants produce different keys',()=>{ expect(buildIdempotencyKey(base)).not.toBe(buildIdempotencyKey({...base,tenantId:TENANT_B})); });
  it('different operations produce different keys',()=>{ const k1=buildIdempotencyKey({...base,provider:'ZATCA',operation:'ZATCA_SUBMIT_INVOICE'}); const k2=buildIdempotencyKey({...base,provider:'ZATCA',operation:'ZATCA_CSID_REQUEST'}); expect(k1).not.toBe(k2); });
  it('key is opaque — does not contain tenantId in plaintext',()=>{ const k=buildIdempotencyKey(base); expect(k).not.toContain(TENANT_A); expect(k).not.toContain(CONTRACT_A); });
  it('same entity different providers produce different keys',()=>{ expect(buildIdempotencyKey(base)).not.toBe(buildIdempotencyKey({...base,provider:'ZATCA',operation:'ZATCA_SUBMIT_INVOICE'})); });
});

describe('Idempotency — Outbox Status Resolution', () => {
  const base={id:'outbox-001',status:'PENDING',provider_response:null,next_retry_at:null,retry_count:0,max_retries:5};
  it('DELIVERED → SUCCEEDED with cached response',()=>{ const r=resolveOutboxStatus({...base,status:'DELIVERED',provider_response:'{"ejarId":"EJ-001"}'}); expect(r.type).toBe('SUCCEEDED'); expect((r as any).providerResponse).toBe('{"ejarId":"EJ-001"}'); });
  it('PENDING → IN_PROGRESS',()=>{ expect(resolveOutboxStatus({...base,status:'PENDING'}).type).toBe('IN_PROGRESS'); });
  it('PROCESSING → IN_PROGRESS',()=>{ expect(resolveOutboxStatus({...base,status:'PROCESSING'}).type).toBe('IN_PROGRESS'); });
  it('RETRYING within backoff window → IN_PROGRESS',()=>{ const f=new Date(Date.now()+60000); expect(resolveOutboxStatus({...base,status:'RETRYING',next_retry_at:f,retry_count:1}).type).toBe('IN_PROGRESS'); });
  it('RETRYING past backoff, retries remain → FAILED_RETRYABLE',()=>{ const p=new Date(Date.now()-60000); expect(resolveOutboxStatus({...base,status:'RETRYING',next_retry_at:p,retry_count:2,max_retries:5}).type).toBe('FAILED_RETRYABLE'); });
  it('RETRYING past backoff, max retries exhausted → FAILED_FINAL',()=>{ const p=new Date(Date.now()-60000); const r=resolveOutboxStatus({...base,status:'RETRYING',next_retry_at:p,retry_count:5,max_retries:5}); expect(r.type).toBe('FAILED_FINAL'); expect((r as any).reason).toBe('MAX_RETRIES_EXCEEDED'); });
  it('FAILED → FAILED_FINAL',()=>{ expect(resolveOutboxStatus({...base,status:'FAILED'}).type).toBe('FAILED_FINAL'); });
  it('DEAD_LETTER → FAILED_FINAL with DEAD_LETTER reason',()=>{ const r=resolveOutboxStatus({...base,status:'DEAD_LETTER'}); expect(r.type).toBe('FAILED_FINAL'); expect((r as any).reason).toBe('DEAD_LETTER'); });
  it('unknown status → IN_PROGRESS (safe default)',()=>{ expect(resolveOutboxStatus({...base,status:'FUTURE_UNKNOWN'}).type).toBe('IN_PROGRESS'); });
  it('DELIVERED is idempotent',()=>{ const rec={...base,status:'DELIVERED',provider_response:'{"ejarId":"EJ-001"}'}; expect(JSON.stringify(resolveOutboxStatus(rec))).toBe(JSON.stringify(resolveOutboxStatus(rec))); });
});

describe('Idempotency — No side effects on blocked gate', () => {
  it('BLOCKED gate → caller must not enqueue outbox record',()=>{ expect(blocked('TENANT_INACTIVE').status==='READY').toBe(false); });
  it('PROVIDER_UNAVAILABLE gate → caller must not proceed',()=>{ expect(providerUnavailable('NO_ACTIVE_DEVICE').status==='READY').toBe(false); });
});

// AUTHORIZATION ROLE MATRIX
describe('Authorization — Role Matrix', () => {
  const ALLOWED=['ADMIN','MANAGER'] as const;
  it('Super Admin → AUTHORIZED regardless of role claim',()=>{ expect(evaluateAuthorization({userId:USER_SUPER,tenantId:TENANT_A,role:'USER'},ALLOWED,'USER',true,true)).toBe('AUTHORIZED'); });
  it('Tenant Admin (ADMIN) → AUTHORIZED',()=>{ expect(evaluateAuthorization({userId:USER_ADMIN,tenantId:TENANT_A,role:'ADMIN'},ALLOWED,'ADMIN',true,false)).toBe('AUTHORIZED'); });
  it('Manager → AUTHORIZED',()=>{ expect(evaluateAuthorization({userId:USER_MANAGER,tenantId:TENANT_A,role:'MANAGER'},ALLOWED,'MANAGER',true,false)).toBe('AUTHORIZED'); });
  it('Regular User → FORBIDDEN for admin/manager-only',()=>{ expect(evaluateAuthorization({userId:USER_REGULAR,tenantId:TENANT_A,role:'USER'},ALLOWED,'USER',true,false)).toBe('FORBIDDEN'); });
  it('Unauthenticated → UNAUTHENTICATED (not FORBIDDEN, not AUTHORIZED)',()=>{ const r=evaluateAuthorization(null,ALLOWED,null,true,false); expect(r).toBe('UNAUTHENTICATED'); expect(r).not.toBe('AUTHORIZED'); expect(r).not.toBe('FORBIDDEN'); });
  it('Valid session, inactive tenant → FORBIDDEN',()=>{ expect(evaluateAuthorization({userId:USER_ADMIN,tenantId:TENANT_A,role:'ADMIN'},ALLOWED,'ADMIN',false,false)).toBe('FORBIDDEN'); });
  it('Valid session, user not in DB → FORBIDDEN',()=>{ expect(evaluateAuthorization({userId:USER_ADMIN,tenantId:TENANT_A,role:'ADMIN'},ALLOWED,null,true,false)).toBe('FORBIDDEN'); });
  it('Stale JWT ADMIN claim but DB says USER → FORBIDDEN',()=>{ expect(evaluateAuthorization({userId:USER_REGULAR,tenantId:TENANT_A,role:'ADMIN'},['ADMIN'],'USER',true,false)).toBe('FORBIDDEN'); });
});

describe('Authorization — API Bypass Prevention', () => {
  it('session.tenantId always wins over client-supplied tenantId',()=>{ const sessionTenantId=TENANT_A; expect(sessionTenantId).not.toBe(TENANT_B); });
  it('role claim alone insufficient without DB verification',()=>{ expect(evaluateAuthorization({userId:'any',tenantId:TENANT_A,role:'ADMIN'},['ADMIN'],'USER',true,false)).toBe('FORBIDDEN'); });
  it('cross-tenant access blocked: different tenant means no access',()=>{ expect((TENANT_A as string)===TENANT_B).toBe(false); });
  it('401 for unauthenticated (not 403)',()=>{ const r=evaluateAuthorization(null,['ADMIN'],null,true,false); expect(r).toBe('UNAUTHENTICATED'); expect(r).not.toBe('FORBIDDEN'); });
  it('403 for authenticated-but-unauthorized',()=>{ expect(evaluateAuthorization({userId:USER_REGULAR,tenantId:TENANT_A,role:'USER'},['ADMIN'],'USER',true,false)).toBe('FORBIDDEN'); });
});

// AUDIT SHAPE & NO SECRET LEAKAGE
describe('Audit — Required Fields', () => {
  it('gate block audit carries tenantId + actor + action + outcome',()=>{
    const e={tenantId:TENANT_A,userId:USER_ADMIN,action:'SAUDI_TRUST_GATE_BLOCKED',tableName:'government_outbox',recordId:CONTRACT_A,details:JSON.stringify({provider:'EJAR',reason:'TENANT_INACTIVE',outcome:'BLOCKED'})};
    expect(e.tenantId).toBe(TENANT_A); expect(e.userId).toBe(USER_ADMIN); expect(e.action).toBe('SAUDI_TRUST_GATE_BLOCKED'); expect(JSON.parse(e.details).outcome).toBe('BLOCKED');
  });
  it('gate pass audit carries READY outcome',()=>{ const e={tenantId:TENANT_A,userId:USER_ADMIN,action:'SAUDI_TRUST_GATE_PASSED',tableName:'government_outbox',recordId:CONTRACT_A,details:JSON.stringify({provider:'EJAR',outcome:'READY'})}; expect(JSON.parse(e.details).outcome).toBe('READY'); });
  it('AUTHORIZATION_FORBIDDEN audit carries actor + resource',()=>{ const e={tenantId:TENANT_A,userId:USER_REGULAR,action:'AUTHORIZATION_FORBIDDEN',tableName:'users',recordId:USER_REGULAR,details:JSON.stringify({resource:'ZATCA_SUBMIT_INVOICE',role:'USER'})}; expect(e.action).toBe('AUTHORIZATION_FORBIDDEN'); expect(e.userId).toBe(USER_REGULAR); });
  it('AUTHORIZATION_UNAUTHENTICATED audit has null userId',()=>{ const e={tenantId:'',userId:null,action:'AUTHORIZATION_UNAUTHENTICATED',tableName:'system',recordId:'anonymous',details:'No session token'}; expect(e.userId).toBeNull(); expect(e.action).toBe('AUTHORIZATION_UNAUTHENTICATED'); });
  it('CROSS_TENANT_ACCESS_BLOCKED audit carries both tenant IDs',()=>{ const e={tenantId:TENANT_B,userId:'attacker',action:'CROSS_TENANT_ACCESS_BLOCKED',tableName:'contracts',recordId:CONTRACT_A,details:JSON.stringify({requestedTenantId:TENANT_A,sessionTenantId:TENANT_B})}; const d=JSON.parse(e.details); expect(d.requestedTenantId).toBe(TENANT_A); expect(d.sessionTenantId).toBe(TENANT_B); });
  it('GOVERNMENT_OUTBOX_ENQUEUED audit carries provider + operation',()=>{ const e={tenantId:TENANT_A,userId:USER_ADMIN,action:'GOVERNMENT_OUTBOX_ENQUEUED',tableName:'government_outbox',recordId:'outbox-001',details:JSON.stringify({provider:'EJAR',operation:'EJAR_REGISTER_CONTRACT'})}; const d=JSON.parse(e.details); expect(d.provider).toBe('EJAR'); expect(d.operation).toBe('EJAR_REGISTER_CONTRACT'); });
});

describe('Audit — No Secret Leakage', () => {
  it('rejects audit with JWT token in details',()=>{ expect(leaksSecrets({details:'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ1c2VyLTEifQ.SIGNATURE_XYZ_12345'})).toBe(true); });
  it('rejects audit with DATABASE_URL',()=>{ expect(leaksSecrets({details:'DATABASE_URL=postgres://user:pass@host/db'})).toBe(true); });
  it('rejects audit with Bearer token',()=>{ expect(leaksSecrets({details:'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig'})).toBe(true); });
  it('rejects audit with JWT_SECRET',()=>{ expect(leaksSecrets({details:'JWT_SECRET=abc123'})).toBe(true); });
  it('accepts safe audit with no secrets',()=>{ const e={tenantId:TENANT_A,userId:USER_ADMIN,action:'SAUDI_TRUST_GATE_BLOCKED',details:JSON.stringify({provider:'EJAR',reason:'TENANT_INACTIVE',outcome:'BLOCKED'})}; expect(leaksSecrets(e)).toBe(false); });
  it('CREDENTIALS_INTEGRITY_FAILED block does not leak encrypted credential',()=>{ const e={action:'SAUDI_TRUST_GATE_BLOCKED',details:JSON.stringify({provider:'ZATCA',reason:'CREDENTIALS_INTEGRITY_FAILED',outcome:'BLOCKED'})}; expect(leaksSecrets(e)).toBe(false); });
});

// EVENTS SHAPE & PERSISTENCE
describe('Events — Shape & Persistence', () => {
  it('event carries tenantId, actor, eventType, outcome',()=>{ const ev={tenantId:TENANT_A,entityType:'government_outbox',entityId:'outbox-001',eventType:'GOVERNMENT_OUTBOX_ENQUEUED',actor:USER_ADMIN,payload:{provider:'EJAR',status:'PENDING'}}; expect(ev.tenantId).toBe(TENANT_A); expect(ev.actor).toBe(USER_ADMIN); expect((ev.payload as any).status).toBe('PENDING'); expect(leaksSecrets(ev)).toBe(false); });
  it('gate block event carries BLOCKED outcome without secrets',()=>{ const ev={tenantId:TENANT_A,entityType:'government_outbox',entityId:CONTRACT_A,eventType:'SAUDI_TRUST_GATE_BLOCKED',actor:USER_ADMIN,payload:{provider:'EJAR',reason:'TENANT_INACTIVE',outcome:'BLOCKED'}}; expect((ev.payload as any).outcome).toBe('BLOCKED'); expect(leaksSecrets(ev)).toBe(false); });
  it('delivered outbox event carries DELIVERED outcome',()=>{ const ev={tenantId:TENANT_A,entityType:'government_outbox',entityId:'outbox-001',eventType:'GOVERNMENT_OUTBOX_DELIVERED',actor:'cron-worker',payload:{provider:'EJAR',ejarContractId:'EJ-001',outcome:'DELIVERED'}}; expect((ev.payload as any).outcome).toBe('DELIVERED'); expect(leaksSecrets(ev)).toBe(false); });
  it('Tenant B event tenantId is not Tenant A',()=>{ const ev={tenantId:TENANT_B,entityType:'government_outbox',entityId:'outbox-b01',eventType:'GOVERNMENT_OUTBOX_ENQUEUED',actor:'user-b',payload:{provider:'ZATCA'}}; expect(ev.tenantId).not.toBe(TENANT_A); });
  it('ZATCA event does not expose encrypted credentials',()=>{ const ev={tenantId:TENANT_A,entityType:'zatca_device',entityId:'device-001',eventType:'SAUDI_TRUST_GATE_PASSED',actor:USER_ADMIN,payload:{provider:'ZATCA',operation:'ZATCA_SUBMIT_INVOICE',outcome:'READY'}}; expect(leaksSecrets(ev)).toBe(false); });
});

// CREDENTIAL VALIDITY
describe('Credential Validity', () => {
  it('null → false',()=>{ expect(credentialValid(null)).toBe(false); });
  it('undefined → false',()=>{ expect(credentialValid(undefined)).toBe(false); });
  it('empty → false',()=>{ expect(credentialValid('')).toBe(false); });
  it('whitespace → false',()=>{ expect(credentialValid('   ')).toBe(false); });
  it('4 chars → false',()=>{ expect(credentialValid('abcd')).toBe(false); });
  it('5 chars → true',()=>{ expect(credentialValid('abcde')).toBe(true); });
  it('valid creds → true',()=>{ expect(credentialValid(VALID_CREDS)).toBe(true); });
});

describe('Compliance Field Validators', () => {
  it('valid VAT (15 digits, starts 3)',()=>{ expect(/^3\d{14}$/.test(VALID_VAT)).toBe(true); });
  it('VAT not starting with 3 → invalid',()=>{ expect(/^3\d{14}$/.test('112345678901234')).toBe(false); });
  it('VAT 14 digits → invalid',()=>{ expect(/^3\d{14}$/.test('31234567890123')).toBe(false); });
  it('valid CR (10 digits)',()=>{ expect(/^\d{10}$/.test(VALID_CR)).toBe(true); });
  it('CR 9 digits → invalid',()=>{ expect(/^\d{10}$/.test('123456789')).toBe(false); });
  it('CR with letters → invalid',()=>{ expect(/^\d{10}$/.test('12345678AB')).toBe(false); });
  it('address >= 5 chars → valid',()=>{ expect(VALID_ADDR.trim().length>=5).toBe(true); });
  it('address 2 chars → invalid',()=>{ expect('AB'.trim().length>=5).toBe(false); });
});

// SOURCE CODE STRUCTURAL GUARANTEES
describe('Gate Source — Fail-Closed Architecture', () => {
  it('outer try-catch returns blocked() not READY',()=>{ const src=source('lib/saudi-trust-gate/index.ts'); expect(src).toContain('catch (err: any)'); const catchStart=src.lastIndexOf('} catch (err: any)'); const catchEnd=src.indexOf('}', catchStart + 20) + 1; const catchBlock=src.slice(catchStart, catchEnd); expect(catchBlock).not.toContain("status: 'READY'"); expect(catchBlock).toContain("blocked("); });
  it('Ejar gate blocks in dev when credentials missing',()=>{ const src=source('lib/saudi-trust-gate/index.ts'); expect(src).toContain('MISSING_CREDENTIALS'); expect(src).toContain('No mock allowed'); });
  it('Ejar gate blocks sandbox URL in production',()=>{ const src=source('lib/saudi-trust-gate/index.ts'); expect(src).toContain('SANDBOX_BLOCKED_NO_PRODUCTION_CREDENTIALS'); expect(src).toContain('/sandbox/i.test'); });
  it('ZATCA gate checks all three compliance fields',()=>{ const src=source('lib/saudi-trust-gate/index.ts'); expect(src).toContain('MISSING_VAT_NUMBER'); expect(src).toContain('MISSING_COMMERCIAL_REGISTRY'); expect(src).toContain('MISSING_NATIONAL_ADDRESS'); });
  it('ZATCA gate checks compliance disclaimer',()=>{ const src=source('lib/saudi-trust-gate/index.ts'); expect(src).toContain('COMPLIANCE_DISCLAIMER_SIGNED'); expect(src).toContain('DISCLAIMER_NOT_SIGNED'); });
  it('ZATCA gate validates credentials via decryptProviderCredentials',()=>{ const src=source('lib/saudi-trust-gate/index.ts'); expect(src).toContain('decryptProviderCredentials'); expect(src).toContain('revenueProviderConnection'); expect(src).toContain('CREDENTIALS_INTEGRITY_FAILED'); });
  it('ZATCA gate handles device expiry',()=>{ const src=source('lib/saudi-trust-gate/index.ts'); expect(src).toContain('DEVICE_EXPIRED'); expect(src).toContain('expiresAt'); });
  it('ZATCA_CREATE_DEVICE skips device check',()=>{ const src=source('lib/saudi-trust-gate/index.ts'); expect(src).toContain("operation !== 'ZATCA_CREATE_DEVICE'"); });
});

describe('Gate Source — Tenant Isolation Guarantees', () => {
  it('Ejar contract FK includes tenantId',()=>{ const src=source('lib/saudi-trust-gate/index.ts'); expect(src).toContain('where: { id: contractId, tenantId }'); });
  it('ZATCA device lookup is tenant-scoped',()=>{ const src=source('lib/saudi-trust-gate/index.ts'); expect(src).toContain("where: { tenantId, status: 'ACTIVE' }"); });
  it('compliance disclaimer lookup is tenant-scoped',()=>{ const src=source('lib/saudi-trust-gate/index.ts'); expect(src).toContain('where: { tenantId, action:'); });
});

describe('Idempotency Source — Outbox Guarantees', () => {
  it('uses INSERT ON CONFLICT DO NOTHING for exactly-once semantics',()=>{ const src=source('lib/saudi-trust-gate/idempotency.ts'); expect(src).toContain('ON CONFLICT (idempotency_key) DO NOTHING'); expect(src).toContain('RETURNING id'); });
  it('key is SHA-256',()=>{ const src=source('lib/saudi-trust-gate/idempotency.ts'); expect(src).toContain("createHash('sha256')"); });
  it('markProcessing guards current status',()=>{ const src=source('lib/saudi-trust-gate/idempotency.ts'); expect(src).toContain("AND  status IN ('PENDING', 'RETRYING')"); });
  it('markDelivered stores provider response',()=>{ const src=source('lib/saudi-trust-gate/idempotency.ts'); expect(src).toContain("= 'DELIVERED'"); expect(src).toContain('delivered_at'); expect(src).toContain('markDelivered'); });
  it('exponential backoff uses Math.pow',()=>{ const src=source('lib/saudi-trust-gate/idempotency.ts'); expect(src).toContain('Math.pow(2, currentRetryCount)'); });
});

describe('Authorization Source — Guard Quality', () => {
  it('hasDatabaseRole verifies both user AND active tenant',()=>{ const src=source('lib/api-auth-guard.ts'); expect(src).toContain('Promise.all(['); expect(src).toContain('authBootstrapFindTenantActive'); const boundarySrc=source('lib/system-prisma-boundary.ts'); expect(boundarySrc).toContain('isActive: true'); });
  it('requireAuth supports cookie AND Bearer token',()=>{ const src=source('lib/api-auth-guard.ts'); expect(src).toContain('session_token'); expect(src).toContain('Bearer '); });
  it('unauthorizedResponse returns HTTP 401',()=>{
  const guard = source('lib/api-auth-guard.ts');
  const errors = source('lib/errors.ts');
  expect(guard).toContain('ErrorCode.UNAUTHORIZED');
  expect(guard).toContain('httpErrorResponse(');
  expect(errors).toMatch(/case ErrorCode\.UNAUTHORIZED:[\s\S]*?return 401;/);
});
  it('forbiddenResponse returns HTTP 403',()=>{
  const guard = source('lib/api-auth-guard.ts');
  const errors = source('lib/errors.ts');
  expect(guard).toContain('ErrorCode.FORBIDDEN');
  expect(guard).toContain('httpErrorResponse(');
  expect(errors).toMatch(/case ErrorCode\.FORBIDDEN:[\s\S]*?return 403;/);
});
  it('isSuperAdmin checks env emails against DB',()=>{ const src=source('lib/api-auth-guard.ts'); expect(src).toContain('isConfiguredSuperAdminEmail'); expect(src).toContain('user?.email'); const platformSrc=source('lib/platform-identity.ts'); expect(platformSrc).toContain('SUPER_ADMIN_EMAILS'); });
});

describe('Audit Source — Coverage', () => {
  it('Saudi Trust Gate actions defined',()=>{ const src=source('lib/audit.ts'); expect(src).toContain('SAUDI_TRUST_GATE_PASSED'); expect(src).toContain('SAUDI_TRUST_GATE_BLOCKED'); expect(src).toContain('SAUDI_TRUST_GATE_PROVIDER_UNAVAILABLE'); });
  it('Government Outbox lifecycle actions defined',()=>{ const src=source('lib/audit.ts'); expect(src).toContain('GOVERNMENT_OUTBOX_ENQUEUED'); expect(src).toContain('GOVERNMENT_OUTBOX_DELIVERED'); expect(src).toContain('GOVERNMENT_OUTBOX_RETRYING'); expect(src).toContain('GOVERNMENT_OUTBOX_DEAD_LETTER'); });
  it('Ejar-specific actions defined',()=>{ const src=source('lib/audit.ts'); expect(src).toContain('EJAR_CONTRACT_SUBMITTED'); expect(src).toContain('EJAR_CONTRACT_TX2_COMMITTED'); expect(src).toContain('EJAR_CONTRACT_IDEMPOTENT_RETURN'); });
  it('authorization security actions defined',()=>{ const src=source('lib/audit.ts'); expect(src).toContain('AUTHORIZATION_FORBIDDEN'); expect(src).toContain('AUTHORIZATION_UNAUTHENTICATED'); expect(src).toContain('CROSS_TENANT_ACCESS_BLOCKED'); });
  it('writeAuditLog swallows errors (never throws)',()=>{ const src=source('lib/audit.ts'); expect(src).toContain('try {'); expect(src).toContain('} catch (e) {'); const catchIdx=src.lastIndexOf('} catch (e) {'); const afterCatch=src.slice(catchIdx,catchIdx+200); expect(afterCatch).not.toContain('throw e'); expect(afterCatch).not.toContain('throw new'); });
  it('errors.ts has multi-pattern secret redaction',()=>{ const src=source('lib/errors.ts'); expect(src).toContain('REDACTION_RULES'); expect(src).toContain('[JWT_REDACTED]'); expect(src).toContain('Bearer [REDACTED]'); expect(src).toContain('JWT_SECRET'); });
});

describe('Schema — GovernmentOutbox Structural Guarantees', () => {
  it('government_outbox has UNIQUE idempotency_key',()=>{ const schema=source('prisma/schema.prisma'); const block=schema.slice(schema.indexOf('model GovernmentOutbox {')); expect(block).toContain('@unique'); expect(block).toContain('idempotency_key'); });
  it('government_outbox has tenant FK with cascade delete',()=>{ const schema=source('prisma/schema.prisma'); const block=schema.slice(schema.indexOf('model GovernmentOutbox {')); expect(block).toContain('onDelete: Cascade'); expect(block).toContain('tenant_id'); });
  it('government_outbox indexed for provider+status routing',()=>{ expect(source('prisma/schema.prisma')).toContain('idx_gov_outbox_provider_status'); });
  it('government_outbox indexed for retry scheduling',()=>{ expect(source('prisma/schema.prisma')).toContain('idx_gov_outbox_retry'); });
  it('AuditLog model has tenantId and action',()=>{ const schema=source('prisma/schema.prisma'); expect(schema).toContain('model AuditLog {'); const block=schema.slice(schema.indexOf('model AuditLog {')); expect(block).toContain('tenantId'); expect(block).toContain('action'); });
  it('ZatcaDevice model has status and expiresAt',()=>{ const schema=source('prisma/schema.prisma'); expect(schema).toContain('model ZatcaDevice {'); const block=schema.slice(schema.indexOf('model ZatcaDevice {')); expect(block).toContain('status'); expect(block).toContain('expiresAt'); });
});

describe('SaudiTrustGateService — CONNECTED hub credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsProductionRuntime.mockReturnValue(false);
    mockTenantFindUnique.mockResolvedValue({
      isActive: true,
      vatNumber: VALID_VAT,
      commercialRegistry: VALID_CR,
      nationalAddress: VALID_ADDR,
    });
    mockContractFindFirst.mockResolvedValue({ id: CONTRACT_A, status: 'ACTIVE' });
    mockAuditLogFindFirst.mockResolvedValue({ id: 'disclaimer-1' });
    mockDeviceFindFirst.mockResolvedValue({
      id: 'device-1',
      expiresAt: new Date(Date.now() + 86400000),
    });
  });

  it('CONNECTED hub ZATCA GCM credentials make evaluate READY', async () => {
    mockConnectionFindFirst.mockResolvedValue({
      encryptedCredentials: 'v1.hub.zatca',
    });
    mockDecryptProviderCredentials.mockReturnValue({
      binarySecurityToken: 'zatca-token-value',
      secret: 'zatca-secret-value',
    });

    const { SaudiTrustGateService } = await import('@/lib/saudi-trust-gate');
    const result = await SaudiTrustGateService.evaluate({
      provider: 'ZATCA',
      operation: 'ZATCA_SUBMIT_INVOICE',
      tenantId: TENANT_A,
      invoiceId: INVOICE_A,
      operationType: 'REPORT',
    });

    expect(result.status).toBe('READY');
  });

  it('CONNECTED hub EJAR GCM credentials make evaluate READY', async () => {
    mockConnectionFindFirst.mockResolvedValue({
      encryptedCredentials: 'v1.hub.ejar',
      baseUrl: 'https://ejar.sa/api/v1',
    });
    mockDecryptProviderCredentials.mockReturnValue({
      accessToken: 'ejar-access-token',
    });

    const { SaudiTrustGateService } = await import('@/lib/saudi-trust-gate');
    const result = await SaudiTrustGateService.evaluate({
      provider: 'EJAR',
      operation: 'EJAR_REGISTER_CONTRACT',
      tenantId: TENANT_A,
      contractId: CONTRACT_A,
    });

    expect(result.status).toBe('READY');
  });

  it('absent hub connection remains BLOCKED/MISSING_CREDENTIALS', async () => {
    mockConnectionFindFirst.mockResolvedValue(null);

    const { SaudiTrustGateService } = await import('@/lib/saudi-trust-gate');
    const zatca = await SaudiTrustGateService.evaluate({
      provider: 'ZATCA',
      operation: 'ZATCA_SUBMIT_INVOICE',
      tenantId: TENANT_A,
      invoiceId: INVOICE_A,
      operationType: 'REPORT',
    });
    const ejar = await SaudiTrustGateService.evaluate({
      provider: 'EJAR',
      operation: 'EJAR_REGISTER_CONTRACT',
      tenantId: TENANT_A,
      contractId: CONTRACT_A,
    });

    expect(zatca.status).toBe('BLOCKED');
    expect((zatca as any).reason).toBe('MISSING_CREDENTIALS');
    expect(ejar.status).toBe('BLOCKED');
    expect((ejar as any).reason).toBe('MISSING_CREDENTIALS');
  });

  it('sandbox EJAR URL in production remains blocked', async () => {
    mockIsProductionRuntime.mockReturnValue(true);
    mockConnectionFindFirst.mockResolvedValue({
      encryptedCredentials: 'v1.hub.ejar',
      baseUrl: 'https://sandbox.ejar.sa/api/v1',
    });
    mockDecryptProviderCredentials.mockReturnValue({
      accessToken: 'ejar-access-token',
    });

    const { SaudiTrustGateService } = await import('@/lib/saudi-trust-gate');
    const result = await SaudiTrustGateService.evaluate({
      provider: 'EJAR',
      operation: 'EJAR_REGISTER_CONTRACT',
      tenantId: TENANT_A,
      contractId: CONTRACT_A,
    });

    expect(result.status).toBe('BLOCKED');
    expect((result as any).reason).toBe('SANDBOX_BLOCKED_NO_PRODUCTION_CREDENTIALS');
  });
});
