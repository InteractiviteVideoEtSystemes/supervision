import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

export const AdminPasswordChange = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      await apiClient.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Password updated successfully.');
    } catch {
      setError('Unable to update password.');
    }
  };

  return (
    <section className="stack">
      <div className="page-heading">
        <div>
          <h2>Change password</h2>
          <p className="subtitle">
            <Link to="/admin">← Back to admin dashboard</Link>
          </p>
        </div>
      </div>

      <form className="form-panel stack" onSubmit={handleSubmit}>
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>
        {message && <div className="success-text">{message}</div>}
        {error && <div className="error-text">{error}</div>}
        <button type="submit">Update password</button>
      </form>
    </section>
  );
};
