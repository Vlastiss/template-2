import { 
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  FieldValue,
} from 'firebase/firestore';
import { db } from './firebase';
import { Team, TeamMember } from '../types/team';

// Teams Collection References
const teamsCollection = collection(db, 'teams');
const teamMembersCollection = collection(db, 'teamMembers');

// Create a new team
export async function createTeam(teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>) {
  const teamRef = doc(teamsCollection);
  const timestamp = serverTimestamp();
  
  await setDoc(teamRef, {
    ...teamData,
    id: teamRef.id,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  // Add the creator as a team member with owner role
  await addTeamMember({
    userId: teamData.ownerId,
    teamId: teamRef.id,
    role: 'owner',
    status: 'active',
    joinedAt: timestamp,
  });

  return teamRef.id;
}

// Get a team by ID
export async function getTeam(teamId: string) {
  const teamDoc = await getDoc(doc(teamsCollection, teamId));
  return teamDoc.exists() ? teamDoc.data() as Team : null;
}

// Get all teams for a user
export async function getUserTeams(userId: string) {
  const membershipQuery = query(
    teamMembersCollection,
    where('userId', '==', userId),
    where('status', '==', 'active')
  );
  
  const memberships = await getDocs(membershipQuery);
  const teams: Team[] = [];
  
  for (const membership of memberships.docs) {
    const teamData = await getTeam(membership.data().teamId);
    if (teamData) teams.push(teamData);
  }
  
  return teams;
}

// Add a member to a team
export async function addTeamMember(memberData: Omit<TeamMember, 'joinedAt'>) {
  const memberRef = doc(teamMembersCollection);
  await setDoc(memberRef, {
    ...memberData,
    joinedAt: serverTimestamp(),
  });
}

// Update team member role
export async function updateTeamMemberRole(userId: string, teamId: string, newRole: TeamMember['role']) {
  const memberQuery = query(
    teamMembersCollection,
    where('userId', '==', userId),
    where('teamId', '==', teamId)
  );
  
  const memberDocs = await getDocs(memberQuery);
  if (!memberDocs.empty) {
    await updateDoc(doc(teamMembersCollection, memberDocs.docs[0].id), {
      role: newRole,
    });
  }
}

// Remove a member from a team
export async function removeTeamMember(userId: string, teamId: string) {
  const memberQuery = query(
    teamMembersCollection,
    where('userId', '==', userId),
    where('teamId', '==', teamId)
  );
  
  const memberDocs = await getDocs(memberQuery);
  if (!memberDocs.empty) {
    await updateDoc(doc(teamMembersCollection, memberDocs.docs[0].id), {
      status: 'inactive',
    });
  }
}

// Update team settings
export async function updateTeamSettings(teamId: string, settings: Partial<Team['settings']>) {
  const teamRef = doc(teamsCollection, teamId);
  await updateDoc(teamRef, {
    settings: settings,
    updatedAt: serverTimestamp(),
  });
}

// Delete a team
export async function deleteTeam(teamId: string) {
  await deleteDoc(doc(teamsCollection, teamId));
  
  // Set all team members to inactive
  const memberQuery = query(
    teamMembersCollection,
    where('teamId', '==', teamId)
  );
  
  const memberDocs = await getDocs(memberQuery);
  const updatePromises = memberDocs.docs.map(doc => 
    updateDoc(doc.ref, { status: 'inactive' })
  );
  
  await Promise.all(updatePromises);
} 