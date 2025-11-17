import { Injectable } from '@angular/core';
import { SupabaseService } from '../../shared/services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class BookService {

  constructor(private supabaseService: SupabaseService) {}

  async addManual(manual: any) {
    // Use the addBook method from SupabaseService directly
    return await this.supabaseService.addBook(manual);
  }
}
