// Run with: npx tsx scripts/test-unified-status-history.ts

interface CustomStatus {
  name: string;
  color: string;
}

function getUnifiedStatus(
  task: { status: string; customStatus?: CustomStatus | null },
  updateData: { status?: string; customStatus?: CustomStatus | null }
) {
  const oldStatusVal = task.customStatus && task.customStatus.name ? task.customStatus : task.status;
  const newCustomStatus = updateData.customStatus !== undefined ? updateData.customStatus : task.customStatus;
  const newStatusVal = newCustomStatus && newCustomStatus.name ? newCustomStatus : (updateData.status || task.status);

  return { oldStatusVal, newStatusVal };
}

// Test case 1: customStatus to standard status (e.g. QA Deployed -> In Review)
const task1 = { status: 'in_review', customStatus: { name: 'QA Deployed', color: '#ef4444' } };
const update1 = { status: 'in_review', customStatus: null };
const res1 = getUnifiedStatus(task1, update1);
console.log('Test 1 (QA Deployed -> In Review):', JSON.stringify(res1.oldStatusVal), '->', JSON.stringify(res1.newStatusVal));
if (typeof res1.oldStatusVal !== 'object' || res1.oldStatusVal.name !== 'QA Deployed' || res1.newStatusVal !== 'in_review') {
  throw new Error('Test 1 failed!');
}

// Test case 2: standard status to customStatus (e.g. In Progress -> QA Deployed)
const task2 = { status: 'in_progress', customStatus: null };
const update2 = { status: 'in_review', customStatus: { name: 'QA Deployed', color: '#ef4444' } };
const res2 = getUnifiedStatus(task2, update2);
console.log('Test 2 (In Progress -> QA Deployed):', JSON.stringify(res2.oldStatusVal), '->', JSON.stringify(res2.newStatusVal));
if (res2.oldStatusVal !== 'in_progress' || typeof res2.newStatusVal !== 'object' || res2.newStatusVal.name !== 'QA Deployed') {
  throw new Error('Test 2 failed!');
}

// Test case 3: customStatus to different standard status (e.g. QA Deployed -> In Progress)
const task3 = { status: 'in_review', customStatus: { name: 'QA Deployed', color: '#ef4444' } };
const update3 = { status: 'in_progress', customStatus: null };
const res3 = getUnifiedStatus(task3, update3);
console.log('Test 3 (QA Deployed -> In Progress):', JSON.stringify(res3.oldStatusVal), '->', JSON.stringify(res3.newStatusVal));
if (typeof res3.oldStatusVal !== 'object' || res3.oldStatusVal.name !== 'QA Deployed' || res3.newStatusVal !== 'in_progress') {
  throw new Error('Test 3 failed!');
}

console.log('ALL UNIFIED STATUS CHECKS PASSED.');
