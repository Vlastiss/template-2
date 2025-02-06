import { collection, query, where, orderBy, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from './useAuth';
import { User } from 'firebase/auth';

interface CustomUser extends User {
  role?: string;
}

interface Job extends DocumentData {
  id: string;
  assignedToId: string;
  createdAt: string;
  // Add other job fields as needed
}

export const useJobs = () => {
  const { user } = useAuth();
  const customUser = user as CustomUser;

  const jobsQuery = customUser ? 
    query(
      collection(db, 'jobs'),
      customUser.role === 'admin' 
        ? orderBy('createdAt', 'desc')
        : where('assignedToId', '==', customUser.uid),
      orderBy('createdAt', 'desc')
    )
    : null;

  const [jobsSnapshot, loading, error] = useCollection(jobsQuery);

  const jobs = jobsSnapshot?.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({
    id: doc.id,
    ...doc.data()
  })) as Job[] | undefined;

  return { jobs, loading, error };
}; 