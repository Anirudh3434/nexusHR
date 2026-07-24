import fs from 'fs';
import path from 'path';

async function test() {
  const url = 'http://localhost:3000/api/tasks?projectId=6a60b616deef6e77b5da36e7&status=all';
  console.log('Fetching tasks from:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'x-user-id': '69da7042692690f1815cb0c2',
        'x-user-role': 'manager',
        'x-company-id': '69da7042692690f1815cb0c1'
      }
    });
    const data = await res.json();
    console.log('API Status:', res.status);
    console.log('Tasks returned:', data.tasks?.map((t: any) => ({ taskNumber: t.taskNumber, title: t.title, sprintId: t.sprintId })));
  } catch (error: any) {
    console.error('Error fetching from API:', error.message);
  }
}

test();
