import { Navigate } from 'react-router';
import { useAuth } from '@/app/context/AuthContext';

export default function UploadResource() {
  const { getUrlSafeName, getUrlSafeEmail } = useAuth();

  return (
    <Navigate
      to={`/Zyndex/Admin/${getUrlSafeName()}/${getUrlSafeEmail()}/Resource-Management`}
      replace
    />
  );
}
