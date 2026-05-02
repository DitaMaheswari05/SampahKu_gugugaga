import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      justifyContent: 'center', height: '100vh', 
      backgroundColor: '#EDF4E6', fontFamily: 'Poppins, sans-serif' 
    }}>
      <h1 style={{ color: '#4C9100', textAlign: 'center' }}>
        Selamat datang di dashboard!
      </h1>
      {user?.name && <p>Halo, {user.name}</p>}
      
      <button 
        onClick={handleLogout} 
        style={{ 
          marginTop: '20px', padding: '10px 20px', 
          backgroundColor: '#FD9D24', color: 'white', 
          border: 'none', borderRadius: '50px', 
          cursor: 'pointer', fontWeight: 600 
        }}>
        Keluar
      </button>
    </div>
  );
};

export default Dashboard;