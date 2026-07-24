import axios from 'axios';

async function queryAPI() {
  const url = 'http://localhost:3000/api/tasks?projectId=6a512507f794ad347786a29c';
  try {
    const res = await axios.get(url, {
      headers: {
        'x-user-id': '69da7042692690f1815cb0c2',
        'x-user-role': 'admin',
        'x-company-id': '69da7042692690f1815cb0c1'
      }
    });
    console.log('API returned tasks count:', res.data.tasks?.length);
    if (res.data.tasks && res.data.tasks.length > 0) {
      res.data.tasks.forEach((t: any) => {
        console.log(`Task: ${t.taskNumber}, Labels:`, t.labels);
      });
    }
  } catch (err: any) {
    console.error('API call failed:', err.response?.data || err.message);
  }
}

queryAPI();
