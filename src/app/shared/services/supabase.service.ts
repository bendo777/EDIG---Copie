import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';
import { Subject, Observable } from 'rxjs'; // Keep Subject and Observable

interface Level { // Add Level interface here for consistency
  id: string; // Changed to string for UUID
  name: string;
}

interface AdminProfile {
  full_name?: string;
  avatar_url?: string;
  role?: string;
  phone?: string;
  bio?: string;
  organization?: string;
  job_title?: string;
  email?: string;
}

interface LastSignInInfo {
  email: string | null;
  last_sign_in_at: string | null;
  created_at: string | null;
}

export interface UserLoginActivityPoint {
  date: string;
  count: number;
}

export interface AdminUserProfile {
  id: string;
  full_name: string;
  email?: string;
  role?: string;
  phone?: string;
  organization?: string;
  avatar_url?: string;
  last_sign_in_at?: string | null;
  created_at?: string | null;
  status?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  public supabase: SupabaseClient;
  private manualAddedSource = new Subject<void>(); // Re-add manualAddedSource
  manualAdded$ = this.manualAddedSource.asObservable(); // Re-add manualAdded$
  private manualUpdatedSource = new Subject<{ title: string }>();
  manualUpdated$ = this.manualUpdatedSource.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey // Use supabaseAnonKey from environment
    );
  }

  async resolveUserRole(user: User | null): Promise<string> {
    if (!user) {
      return 'user';
    }

    try {
      const profile = await this.getAdminProfileByUserId(user.id, user.email);

      const resolved =
        this.normalizeRole(profile?.role) ||
        this.extractRoleCandidates(user.user_metadata) ||
        this.extractRoleCandidates(user.app_metadata) ||
        this.extractRoleFromArray(user.app_metadata?.['roles']) ||
        this.extractRoleFromArray(user.user_metadata?.['roles']);

      if (!resolved && this.hasAdminFlag(user)) {
        return 'admin';
      }

      if (!resolved) {
        return 'user';
      }

      switch (resolved) {
        case 'admin':
        case 'superadmin':
        case 'administrator':
        case 'administrateur':
          return 'admin';
        case 'enseignant':
        case 'teacher':
        case 'prof':
          return 'enseignant';
        case 'eleve':
        case 'élève':
        case 'student':
          return 'eleve';
        default:
          return 'user';
      }
    } catch (err) {
      console.warn('Unable to resolve user role:', err);
      return 'user';
    }
  }

  // ✅ Fonction robuste pour récupérer l'utilisateur connecté
  async getUser(): Promise<User | null> {
    try {
      const sessionResponse = await this.supabase.auth.getSession();

      if (!sessionResponse || !sessionResponse.data) {
        console.warn('⚠️ No session response from Supabase.');
        return null;
      }

      const { session } = sessionResponse.data;

      if (!session) {
        console.warn('⚠️ No active session found.');
        return null;
      }

      const userResponse = await this.supabase.auth.getUser();

      if (!userResponse || !userResponse.data) {
        console.warn('⚠️ No user data returned from Supabase.');
        return null;
      }

      if (userResponse.error) {
        console.error('Supabase getUser error:', userResponse.error);
        return null;
      }

      return userResponse.data.user;
    } catch (err) {
      console.error('Error getting user:', err);
      return null;
    }
  }

  async getAdminProfileByUserId(userId: string, email?: string | null): Promise<AdminProfile | null> {
    if (!userId) {
      return null;
    }

    const lookups = [
      { column: 'id', value: userId },
      { column: 'user_id', value: userId },
    ];

    if (email) {
      lookups.push({ column: 'email', value: email });
    }

    for (const lookup of lookups) {
      if (!lookup.value) {
        continue;
      }

      try {
        const { data, error, status } = await this.supabase
          .from('profiles')
          .select('*')
          .eq(lookup.column, lookup.value)
          .maybeSingle();

        if (data) {
          return this.mapProfileRecord(data);
        }

        if (error && status !== 406) {
          console.warn(`Error fetching admin profile by ${lookup.column}:`, error.message);
        }
      } catch (err) {
        console.warn(`Unexpected error fetching admin profile by ${lookup.column}:`, err);
      }
    }

    return null;
  }

  private mapProfileRecord(record: any): AdminProfile {
    return {
      full_name:
        record.full_name ||
        record.name ||
        [record.first_name, record.last_name].filter(Boolean).join(' ') ||
        record.email ||
        undefined,
      avatar_url: record.avatar_url,
      role: record.role || record.user_role || record.account_role,
      phone: record.phone || record.phone_number,
      bio: record.bio || record.about,
      organization: record.organization || record.company,
      job_title: record.job_title || record.position,
      email: record.email || record.contact_email,
    };
  }

  private extractRoleCandidates(metadata: Record<string, any> | undefined): string | undefined {
    if (!metadata) {
      return undefined;
    }

    const possibleKeys = ['role', 'user_role', 'account_role', 'profile_role'];
    for (const key of possibleKeys) {
      const normalized = this.normalizeRole(metadata[key]);
      if (normalized) {
        return normalized;
      }
    }

    return undefined;
  }

  private extractRoleFromArray(value: any): string | undefined {
    if (Array.isArray(value) && value.length > 0) {
      return this.normalizeRole(String(value[0]));
    }
    if (typeof value === 'string') {
      return this.normalizeRole(value);
    }
    return undefined;
  }

  private hasAdminFlag(user: User): boolean {
    const flagKeys = ['is_admin', 'admin', 'admin_flag', 'isAdmin'];
    const metadataSources = [user.user_metadata, user.app_metadata];

    for (const source of metadataSources) {
      if (!source) continue;
      for (const key of flagKeys) {
        if (this.isTruthy(source[key])) {
          return true;
        }
      }
    }
    return false;
  }

  private isTruthy(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return ['true', '1', 'yes', 'oui'].includes(normalized);
    }
    return false;
  }

  private normalizeRole(value?: string | null): string | undefined {
    if (!value) {
      return undefined;
    }
    return value.trim().toLowerCase();
  }

  // 🔴 SUPPRIMÉ : updateLastSignIn n'est plus nécessaire
  // Supabase gère automatiquement last_sign_in dans auth.users
  // async updateLastSignIn(userId: string): Promise<void> { ... }

  // 🟢 NEW: Récupérer les informations d'un utilisateur depuis auth.users
  async getUserWithLastSignIn(userId: string): Promise<any> {
    try {
      const { data: authUser, error } = await this.supabase.auth.admin.getUserById(userId);
      
      if (error || !authUser) {
        console.warn('Error fetching user from auth.users:', error);
        return null;
      }

      return {
        id: authUser.user.id,
        email: authUser.user.email,
        last_sign_in_at: authUser.user.last_sign_in_at, // ← Vient de auth.users !
        created_at: authUser.user.created_at,
      };
    } catch (err) {
      console.error('Error in getUserWithLastSignIn:', err);
      return null;
    }
  }

  // 🟢 NEW: Récupérer TOUS les utilisateurs avec leurs dernières connexions
  async getAllUsersWithLastSignIn(): Promise<any[]> {
    try {
      const { data: users, error } = await this.supabase.auth.admin.listUsers();
      
      if (error || !users) {
        console.warn('Error fetching users from auth.users:', error);
        return [];
      }

      // Mapper les données de auth.users
      return users.users.map(user => ({
        id: user.id,
        email: user.email,
        last_sign_in_at: user.last_sign_in_at, // ← La vraie dernière connexion !
        created_at: user.created_at,
      }));
    } catch (err) {
      console.error('Error in getAllUsersWithLastSignIn:', err);
      return [];
    }
  }

  async getUserLoginActivity(days = 30): Promise<UserLoginActivityPoint[]> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_signin_activity', { days });

      if (error) {
        console.warn('Error fetching user login activity via RPC:', error.message);
        return [];
      }

      return (data || []).map((row: any) => ({
        date: row.activity_date,
        count: Number(row.login_count) || 0,
      }));
    } catch (err) {
      console.error('Unexpected error in getUserLoginActivity:', err);
      return [];
    }
  }

  // Updated addBook method for safe insertion as per your suggestion
  async addBook(manualData: any) {
    const user = await this.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('🧾 Données envoyées à Supabase:', manualData);

    const { data, error } = await this.supabase
      .from('manuals')
      .insert([manualData]) // Use manualData directly
      .select('*'); // Add .select() to get back the inserted data

    if (error) {
      console.error('❌ Error inserting manual:', error);
      if (error.details) console.error('Supabase Error Details:', error.details);
      if (error.hint) console.error('Supabase Error Hint:', error.hint);
      if (error.code) console.error('Supabase Error Code:', error.code);
      throw error;
    }

    console.log('✅ Manuel ajouté avec succès:', data);
    this.notifyManualAdded(); // Notify dashboard that a new manual has been added
    return data; // Return the inserted data
  }

  // New method to fetch levels
  async getLevels(): Promise<Level[]> {
    const { data, error } = await this.supabase
      .from('levels')
      .select('id, name');

    if (error) {
      console.error('Erreur lors de la récupération des niveaux :', error);
      return [];
    } else {
      console.log('✅ Niveaux chargés :', data);
      return data as Level[];
    }
  }

  // Re-add notifyManualAdded
  notifyManualAdded(): void {
    this.manualAddedSource.next();
  }

  notifyManualUpdated(title: string): void {
    console.log('SupabaseService: notifyManualUpdated', title);
    this.manualUpdatedSource.next({ title });
  }

  // Keep getCurrentSession (if still needed, though getUser is now robust)
  async getCurrentSession() {
    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  // Keeping getBooks and uploadImage as they seem functional
  async getBooks() {
    const { data, error } = await this.supabase.from('manuals').select('*');
    if (error) throw error;
    return data;
  }

  async uploadImage(file: File, bucketName: string): Promise<{ filePath: string | null; error: any }> {
    const filePathInBucket = `manuals/${Date.now()}_${file.name}`;
    const { error: uploadError } = await this.supabase.storage
      .from(bucketName)
      .upload(filePathInBucket, file);

    if (uploadError) {
      return { filePath: null, error: uploadError };
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(bucketName)
      .getPublicUrl(filePathInBucket);

    return { filePath: publicUrlData.publicUrl, error: null };
  }

  async getRecentManuals(): Promise<any[]> {
    const response = await this.supabase
      .from('manuals')
      .select('id, title, author, publisher, subject, description, image_url, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data, error } = response;

    if (error) {
      console.error('Error fetching recent manuals:', error.message);
      return [];
    }
    return data as any[];
  }

  // Add an activity record to the activities table
  async addActivity(message: string) {
    try {
      const user = await this.getUser();
      const activityData: any = {
        message,
        created_by: user ? user.id : null
      };

      const { data, error } = await this.supabase
        .from('activities')
        .insert([activityData])
        .select('*');

      if (error) {
        console.error('Error inserting activity:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (err) {
      console.error('Error in addActivity:', err);
      return null;
    }
  }

  // Fetch recent activities from the activities table
  // Realtime: subscribe to manuals UPDATE events
  private manualsUpdateChannel: RealtimeChannel | null = null;

  subscribeToManualUpdates(callback: (payload: any) => void): void {
    if (this.manualsUpdateChannel) return;
    const attemptSubscribe = () => {
      this.manualsUpdateChannel = this.supabase
        .channel('manuals-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'manuals' }, (payload) => {
          try {
            callback(payload);
          } catch (e) {
            console.error('Error in manuals update callback:', e);
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'manuals' }, (payload) => {
          try {
            callback(payload);
          } catch (e) {
            console.error('Error in manuals insert callback:', e);
          }
        })
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            console.warn('Manuals updates channel status:', status);
            if (status === 'CLOSED' || status === 'TIMED_OUT') {
              // Retry after a short delay
              setTimeout(() => {
                if (this.manualsUpdateChannel) {
                  this.supabase.removeChannel(this.manualsUpdateChannel);
                  this.manualsUpdateChannel = null;
                }
                attemptSubscribe();
              }, 1000);
            }
          }
        });
    };
    attemptSubscribe();
  }

  unsubscribeFromManualUpdates(): void {
    if (this.manualsUpdateChannel) {
      this.supabase.removeChannel(this.manualsUpdateChannel);
      this.manualsUpdateChannel = null;
    }
  }

  async getTotalManualsCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from('manuals')
      .select('count', { count: 'exact' });

    if (error) {
      console.error('Error fetching total manuals count:', error.message);
      throw error;
    }
    return count || 0;
  }

  async getManualsCountByLevel(): Promise<{ levelName: string; count: number }[]> {
    const { data: levels, error: levelsError } = await this.supabase
      .from('levels')
      .select('id, name');

    if (levelsError) {
      console.error('Error fetching levels for count by level:', levelsError.message);
      throw levelsError;
    }

    if (!levels) {
      return [];
    }

    const counts: { levelName: string; count: number }[] = [];
    for (const level of levels) {
      const { count, error } = await this.supabase
        .from('manuals')
        .select('count', { count: 'exact' })
        .eq('level_id', level.id);

      if (error) {
        console.error(`Error fetching manual count for level ${level.name}:`, error.message);
        // Continue to next level even if one fails
      }
      counts.push({ levelName: level.name, count: count || 0 });
    }

    return counts;
  }

  async getManualsEvolutionData(): Promise<{ date: string; count: number }[]> {
    const { data, error } = await this.supabase.rpc('get_manuals_evolution');

    if (error) {
      console.error('Error fetching manuals evolution data:', error.message);
      throw error;
    }

    return data || [];
  }

  async getAverageTimeBetweenAdditions(): Promise<string> {
    const { data: manuals, error } = await this.supabase
      .from('manuals')
      .select('created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching manual creation dates:', error.message);
      throw error;
    }

    if (!manuals || manuals.length < 2) {
      return 'N/A'; // Not enough manuals to calculate a difference
    }

    const timestamps = manuals.map(manual => new Date(manual.created_at).getTime());

    let totalDifference = 0;
    for (let i = 1; i < timestamps.length; i++) {
      totalDifference += (timestamps[i] - timestamps[i - 1]);
    }

    const averageDifferenceMs = totalDifference / (timestamps.length - 1);
    const averageDifferenceSeconds = averageDifferenceMs / 1000;

    // Convert to human-readable format (e.g., days, hours, minutes, seconds)
    const days = Math.floor(averageDifferenceSeconds / (3600 * 24));
    const hours = Math.floor((averageDifferenceSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((averageDifferenceSeconds % 3600) / 60);
    const seconds = Math.floor(averageDifferenceSeconds % 60);

    let result = '';
    if (days > 0) result += `${days}j `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (seconds > 0 || result === '') result += `${seconds}s`;

    return result.trim();
  }

  // 🟢 NEW: Récupérer les dernières connexions via RPC function
  async getUsersLastSignIn(): Promise<Map<string, LastSignInInfo>> {
    try {
      const { data, error } = await this.supabase.rpc('get_users_with_last_signin');

      if (error) {
        console.warn('Error fetching users last sign in via RPC:', error.message);
        return new Map();
      }

      // Créer une map : user_id → informations de connexion
      const map = new Map<string, LastSignInInfo>();
      (data || []).forEach((user: any) => {
        map.set(user.user_id, {
          email: user.email ?? null,
          last_sign_in_at: user.last_sign_in_at ?? null,
          created_at: user.created_at ?? null,
        });
      });

      return map;
    } catch (err) {
      console.error('Unexpected error in getUsersLastSignIn:', err);
      return new Map();
    }
  }

  async getAdminUsers(): Promise<AdminUserProfile[]> {
    try {
      // Approche 1️⃣ : Récupérer les profils depuis profiles table
      const { data: profiles, error: profilesError } = await this.supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError.message);
        return [];
      }

      // Approche 2️⃣ : Récupérer les dernières connexions via RPC
      const lastSignInMap = await this.getUsersLastSignIn();

      if (!profiles) {
        return [];
      }

      // Mapper les profils avec les données de last_sign_in_at
      return profiles.map((row: any) => {
        const lastSignInInfo = lastSignInMap.get(row.id);
        return {
          id: row.id,
          full_name: row.full_name
            || row.name
            || [row.first_name, row.last_name].filter(Boolean).join(' ')
            || 'Utilisateur',
          email: row.email || lastSignInInfo?.email || '',
          role: row.role || row.user_role || 'user',
          phone: row.phone || row.phone_number || '',
          organization: row.organization || row.company || '',
          avatar_url: row.avatar_url || '',
          // ✅ Récupérer last_sign_in_at depuis la RPC function
          last_sign_in_at: lastSignInInfo?.last_sign_in_at || null,
          created_at: lastSignInInfo?.created_at || row.created_at || row.inserted_at || null,
          status: row.status || row.account_status || null,
        };
      });
    } catch (err) {
      console.error('Unexpected error fetching admin users:', err);
      return [];
    }
  }

    // New method to expose onAuthStateChange as an Observable
  getAuthStateChange(): Observable<{ event: string; session: any | null }> {
    return new Observable(observer => {
      this.supabase.auth.onAuthStateChange((event, session) => {
        observer.next({ event, session });
      });
    });
  }
}

