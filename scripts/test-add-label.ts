import axios from 'axios';

async function testAddLabel() {
  const taskId = '6a55edbe4389f755bbd81583'; // TSK26070003
  const url = 'http://localhost:3000/api/tasks';

  const payload = {
    taskId,
    labels: [
      {
        _id: 'custom-1784138935143',
        name: 'android ',
        color: '#ef4444'
      }
    ]
  };

  try {
    console.log('Sending PATCH request to update labels on TSK26070003...');
    const response = await axios.patch(url, payload, {
      headers: {
        'x-user-id': '69da7042692690f1815cb0c2',
        'x-user-role': 'admin',
        'x-company-id': '69da7042692690f1815cb0c1',
        'Content-Type': 'application/json'
      }
    });

    console.log('Response Status:', response.status);
    console.log('Response Task Labels:', response.data.task?.labels);
  } catch (error: any) {
    console.error('Request failed:', error.response?.data || error.message);
  }
}

testAddLabel();
