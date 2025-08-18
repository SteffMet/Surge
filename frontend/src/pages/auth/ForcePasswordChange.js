import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../services/AuthContext';
import { setNotification } from '../../redux/notificationSlice';

const ForcePasswordChange = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { forcePasswordChange } = useAuth();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      dispatch(setNotification({ message: 'Passwords do not match', type: 'error' }));
      return;
    }
    
    const { success, error } = await forcePasswordChange(password);

    if (success) {
      dispatch(setNotification({ message: 'Password changed successfully. Please log in again.', type: 'success' }));
      // The logout is handled within forcePasswordChange, which will trigger redirect to login
    } else {
      dispatch(setNotification({ message: error, type: 'error' }));
    }
  };

  return (
    <div>
      <h2>Change Your Password</h2>
      <p>As a new administrator, you must change your password before you can proceed.</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label>New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Change Password</button>
      </form>
    </div>
  );
};

export default ForcePasswordChange;