
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Upload: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/settings');
  }, [navigate]);
  return null;
};

export default Upload;
