import { DUMMY_USERS, User } from '../utils/mockData';

// Simulating a real authentication flow
export const login = async (role: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = DUMMY_USERS.find(u => u.role === role);
      if (user) {
        resolve(user);
      } else {
        reject(new Error('User not found'));
      }
    }, 800); // Fake network delay
  });
};
