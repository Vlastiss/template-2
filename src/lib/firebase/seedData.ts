import { db } from './firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';

export const seedExampleData = async () => {
  try {
    // Example Companies with their nested users and jobs
    const companies = [
      {
        id: 'quick-fix-services',
        data: {
          name: 'Quick Fix Services',
          email: 'admin@quickfix.com',
          phone: '+1 (555) 123-4567',
          address: '123 Repair Street, Fixtown, FX 12345',
          createdAt: Timestamp.now(),
        },
        users: [
          {
            id: 'john-smith',
            data: {
              email: 'john@quickfix.com',
              name: 'John Smith',
              role: 'admin',
              phone: '+1 (555) 111-2222',
              createdAt: Timestamp.now(),
            }
          },
          {
            id: 'mike-tech',
            data: {
              email: 'mike@quickfix.com',
              name: 'Mike Tech',
              role: 'technician',
              phone: '+1 (555) 333-4444',
              createdAt: Timestamp.now(),
            }
          }
        ],
        jobs: [
          {
            id: 'job-001',
            data: {
              title: 'Leaky Faucet Repair',
              description: 'Fix leaking kitchen faucet and replace washers',
              status: 'in-progress',
              priority: 'medium',
              clientName: 'Alice Johnson',
              clientPhone: '+1 (555) 123-9999',
              clientEmail: 'alice@email.com',
              clientAddress: '789 Leaky Lane, Watertown, WT 12345',
              assignedTo: 'mike-tech',
              estimatedDuration: '2 hours',
              scheduledFor: Timestamp.fromDate(new Date(Date.now() + 86400000)), // Tomorrow
              createdAt: Timestamp.now(),
            }
          },
          {
            id: 'job-002',
            data: {
              title: 'Electrical Panel Upgrade',
              description: 'Upgrade main electrical panel from 100A to 200A service',
              status: 'scheduled',
              priority: 'high',
              clientName: 'Bob Wilson',
              clientPhone: '+1 (555) 987-8888',
              clientEmail: 'bob@email.com',
              clientAddress: '321 Power Street, Voltville, VV 67890',
              assignedTo: 'mike-tech',
              estimatedDuration: '6 hours',
              scheduledFor: Timestamp.fromDate(new Date(Date.now() + 172800000)), // Day after tomorrow
              createdAt: Timestamp.now(),
            }
          }
        ]
      },
      {
        id: 'home-heroes',
        data: {
          name: 'Home Heroes',
          email: 'contact@homeheroes.com',
          phone: '+1 (555) 987-6543',
          address: '456 Maintenance Ave, Repairville, RV 67890',
          createdAt: Timestamp.now(),
        },
        users: [
          {
            id: 'sarah-admin',
            data: {
              email: 'sarah@homeheroes.com',
              name: 'Sarah Admin',
              role: 'admin',
              phone: '+1 (555) 555-6666',
              createdAt: Timestamp.now(),
            }
          }
        ],
        jobs: [
          {
            id: 'job-003',
            data: {
              title: 'General Home Inspection',
              description: 'Complete home inspection for new property purchase',
              status: 'new',
              priority: 'medium',
              clientName: 'Carol Davis',
              clientPhone: '+1 (555) 456-7777',
              clientEmail: 'carol@email.com',
              clientAddress: '654 Inspection Ave, Checktown, CT 34567',
              assignedTo: 'sarah-admin',
              estimatedDuration: '4 hours',
              scheduledFor: Timestamp.fromDate(new Date(Date.now() + 259200000)), // 3 days from now
              createdAt: Timestamp.now(),
            }
          }
        ]
      }
    ];

    console.log('Starting to seed data...');

    // Write companies and their nested collections
    for (const company of companies) {
      // Add company document
      await setDoc(doc(db, 'companies', company.id), company.data);
      console.log(`Added company: ${company.data.name}`);

      // Add users as a subcollection
      for (const user of company.users) {
        await setDoc(
          doc(db, 'companies', company.id, 'users', user.id),
          user.data
        );
        console.log(`Added user: ${user.data.name} to ${company.data.name}`);
      }

      // Add jobs as a subcollection
      for (const job of company.jobs) {
        await setDoc(
          doc(db, 'companies', company.id, 'jobs', job.id),
          job.data
        );
        console.log(`Added job: ${job.data.title} to ${company.data.name}`);
      }
    }

    console.log('Successfully seeded all example data!');
    return { success: true };
  } catch (error) {
    console.error('Error seeding data:', error);
    return { success: false, error };
  }
}; 