// Run with: npx tsx scripts/test-auto-comment-mention.ts
import connectDB from '../lib/mongodb';
import mongoose from 'mongoose';

async function runCheck() {
  await connectDB();
  console.log('Connected to DB');
  
  const testAssignees = [
    { name: 'John Doe' },
    { name: 'Jane Doe' }
  ];
  
  // 1. Test mapping to prepended @
  const assigneeNames = testAssignees.map(a => `@${a.name}`).join(', ') || 'Unassigned';
  console.log('Assignee Names:', assigneeNames);
  if (assigneeNames !== '@John Doe, @Jane Doe') {
    throw new Error(`Expected "@John Doe, @Jane Doe" but got "${assigneeNames}"`);
  }
  
  // 2. Test template substitution and @@ removal
  const templates = [
    'Moved to status. Assigned to @{{assignee}}',
    'Assigned to {{assignee}}'
  ];
  
  for (const template of templates) {
    let renderedText = template;
    renderedText = renderedText.replace(/\{\{\s*assignee\s*\}\}/gi, assigneeNames);
    renderedText = renderedText.replace(/@@/g, '@');
    console.log(`Template: "${template}" -> Rendered: "${renderedText}"`);
    
    if (renderedText !== 'Moved to status. Assigned to @John Doe, @Jane Doe' && 
        renderedText !== 'Assigned to @John Doe, @Jane Doe') {
      throw new Error(`Replacement failed for template "${template}": got "${renderedText}"`);
    }
  }
  
  console.log('ALL CHECKS PASSED.');
  await mongoose.disconnect();
}

runCheck().catch(err => {
  console.error('Check failed:', err);
  process.exit(1);
});
