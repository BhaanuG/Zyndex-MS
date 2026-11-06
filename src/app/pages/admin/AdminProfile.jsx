import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Save, Shield, Edit, X } from 'lucide-react';
import AdminLayout from '@/app/components/AdminLayout';
import { useAuth } from '@/app/context/AuthContext';
import PasswordChangePanel from '@/app/components/PasswordChangePanel';

export default function AdminProfile() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({ name: '', email: '', bio: '', role: 'Administrator' });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        bio: user.bio || '',
        role: 'Administrator',
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(profileData);
      setIsEditing(false);
    } catch (error) {
      alert(error.message || 'Failed to update profile.');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-semibold text-gray-900 mb-8">My Profile</h1>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="size-24 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-3xl font-semibold mx-auto mb-4">
              {profileData.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{profileData.name}</h3>
            <p className="text-sm text-gray-500 mb-2">{profileData.email}</p>
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
              <Shield className="size-3" />
              {profileData.role}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" /><input type="text" name="name" value={profileData.name} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} disabled={!isEditing} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-50" /></div>
              <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" /><input type="email" name="email" value={profileData.email} onChange={(e) => setProfileData({ ...profileData, email: e.target.value })} disabled={!isEditing} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg disabled:bg-gray-50" /></div>
              <textarea name="bio" value={profileData.bio} onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })} disabled={!isEditing} rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg resize-none disabled:bg-gray-50" />
              <div className="flex justify-end gap-2">
                {isEditing ? (
                  <>
                    <button type="button" onClick={() => setIsEditing(false)} className="flex items-center gap-2 px-6 py-3 bg-gray-200 rounded-lg font-medium"><X className="size-4" />Cancel</button>
                    <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium"><Save className="size-4" />Save Changes</button>
                  </>
                ) : (
                  <button type="button" onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-medium"><Edit className="size-4" />Edit Profile</button>
                )}
              </div>
            </form>
            <PasswordChangePanel user={user} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
