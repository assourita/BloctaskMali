import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { Subscription, interval } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface Message {
  id: string;
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
  };
  content: string;
  message_type: 'text' | 'image' | 'location' | 'system';
  attachment_url?: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  mission?: {
    id: string;
    title: string;
    status: string;
  };
  other_participant: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
  };
  last_message?: Message;
  unread_count: number;
  can_write?: boolean;
  is_closed?: boolean;
  updated_at: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSnackBarModule,
    MatChipsModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="chat-container" [class.sidebar-open]="showSidebar" [class.embedded]="embedded">
      <!-- Sidebar - Liste des conversations -->
      <div class="conversations-sidebar" *ngIf="showSidebar">
        <div class="sidebar-header">
          <h2><mat-icon>chat</mat-icon> Messages</h2>
        </div>
        
        <div class="conversations-list" *ngIf="!loading">
          <div class="conversation-item" 
               *ngFor="let conv of conversations"
               [class.active]="currentConversation?.id === conv.id"
               [class.unread]="conv.unread_count > 0"
               (click)="selectConversation(conv)">
            <div class="avatar">
              <img *ngIf="conv.other_participant.profile_picture" [src]="conv.other_participant.profile_picture">
              <span *ngIf="!conv.other_participant.profile_picture">
                {{ (conv.other_participant.first_name[0] || '') + (conv.other_participant.last_name[0] || '') }}
              </span>
            </div>
            <div class="conversation-info">
              <h4>{{ conv.other_participant.first_name }} {{ conv.other_participant.last_name }}</h4>
              <p class="last-message" *ngIf="conv.last_message">
                {{ conv.last_message.content | slice:0:40 }}{{ conv.last_message.content.length > 40 ? '...' : '' }}
              </p>
              <p class="mission-ref" *ngIf="conv.mission">{{ conv.mission.title }}</p>
            </div>
            <div class="meta">
              <span class="time">{{ formatTime(conv.updated_at) }}</span>
              <span class="unread-badge" *ngIf="conv.unread_count > 0">{{ conv.unread_count }}</span>
            </div>
          </div>
        </div>
        
        <div class="empty-sidebar" *ngIf="conversations.length === 0 && !loading">
          <mat-icon>chat_bubble_outline</mat-icon>
          <p>Aucune conversation</p>
        </div>
      </div>

      <!-- Zone de chat -->
      <div class="chat-area">
        <!-- Header -->
        <div class="chat-header" *ngIf="currentConversation">
          <button mat-icon-button class="toggle-sidebar" (click)="showSidebar = !showSidebar">
            <mat-icon>{{ showSidebar ? 'chevron_left' : 'menu' }}</mat-icon>
          </button>
          <div class="user-info">
            <div class="avatar small">
              <img *ngIf="currentConversation.other_participant.profile_picture" 
                   [src]="currentConversation.other_participant.profile_picture">
              <span *ngIf="!currentConversation.other_participant.profile_picture">
                {{ (currentConversation.other_participant.first_name[0] || '') +
                   (currentConversation.other_participant.last_name[0] || '') }}
              </span>
            </div>
            <div>
              <h4>{{ currentConversation.other_participant.first_name }} {{ currentConversation.other_participant.last_name }}</h4>
              <span class="mission-title" *ngIf="currentConversation.mission">
                {{ currentConversation.mission.title }}
              </span>
            </div>
          </div>
          <button mat-icon-button [routerLink]="getMissionRoute()">
            <mat-icon>visibility</mat-icon>
          </button>
        </div>

        <div class="chat-header placeholder" *ngIf="!currentConversation">
          <button mat-icon-button class="toggle-sidebar" (click)="showSidebar = !showSidebar">
            <mat-icon>menu</mat-icon>
          </button>
          <span>Sélectionnez une conversation</span>
        </div>

        <!-- Messages -->
        <div class="messages-container" #messagesContainer *ngIf="currentConversation">
          <div class="loading-messages" *ngIf="loadingMessages">
            <mat-spinner diameter="30"></mat-spinner>
          </div>
          
          <div class="messages-list" *ngIf="!loadingMessages">
            <div class="message-group" *ngFor="let msg of messages">
              <div class="message" [class.own]="isOwnMessage(msg)" [class.system]="msg.message_type === 'system'">
                <div class="message-avatar" *ngIf="!isOwnMessage(msg) && msg.message_type !== 'system'">
                  <img *ngIf="msg.sender.profile_picture" [src]="msg.sender.profile_picture">
                  <span *ngIf="!msg.sender.profile_picture">
                    {{ (msg.sender.first_name[0] || '') + (msg.sender.last_name[0] || '') }}
                  </span>
                </div>
                <div class="message-content">
                  <div class="bubble" [class.image]="msg.message_type === 'image'">
                    <p *ngIf="msg.message_type === 'text'">{{ msg.content }}</p>
                    <img *ngIf="msg.message_type === 'image'" [src]="msg.attachment_url" (click)="viewImage(msg.attachment_url)">
                    <div *ngIf="msg.message_type === 'location'" class="location-message">
                      <mat-icon>place</mat-icon>
                      <span>{{ msg.content }}</span>
                    </div>
                    <p *ngIf="msg.message_type === 'system'" class="system-text">{{ msg.content }}</p>
                  </div>
                  <span class="timestamp">{{ formatTime(msg.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="no-conversation" *ngIf="!currentConversation">
          <mat-icon>chat</mat-icon>
          <p>Sélectionnez une conversation pour commencer</p>
        </div>

        <!-- Input area -->
        <div class="input-area" *ngIf="currentConversation">
          <p class="chat-closed" *ngIf="!canWrite()">Messagerie fermée — mission terminée ou non démarrée.</p>
          <div class="input-container" *ngIf="canWrite()">
            <button mat-icon-button class="attach-btn" (click)="attachFile()">
              <mat-icon>attach_file</mat-icon>
            </button>
            <mat-form-field appearance="outline" class="message-input">
              <input matInput 
                     [(ngModel)]="newMessage" 
                     placeholder="Écrivez votre message..."
                     (keydown.enter)="sendMessage()">
            </mat-form-field>
            <button mat-fab color="primary" class="send-btn" (click)="sendMessage()" [disabled]="!newMessage.trim() || sending">
              <mat-icon *ngIf="!sending">send</mat-icon>
              <mat-spinner *ngIf="sending" diameter="20"></mat-spinner>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      height: 100%;
      box-sizing: border-box;
    }

    .chat-container {
      display: flex;
      height: calc(100dvh - 64px);
      height: calc(100vh - 64px);
      background: #f5f5f5;
      min-width: 0;
      max-width: 100%;
      width: 100%;
      overflow: hidden;
      box-sizing: border-box;

      &.embedded {
        height: 100%;
        min-height: 280px;
        max-height: none;
        border-radius: 0 0 12px 12px;
      }
      
      .conversations-sidebar {
        width: min(320px, 100%);
        flex-shrink: 0;
        background: #fff;
        border-right: 1px solid #e0e0e0;
        display: flex;
        flex-direction: column;
        min-height: 0;
        
        .sidebar-header {
          padding: 16px 20px; border-bottom: 1px solid #e0e0e0;
          h2 { margin: 0; display: flex; align-items: center; gap: 12px; font-size: clamp(16px, 4vw, 20px); }
        }
        
        .conversations-list {
          flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch;
          .conversation-item {
            display: flex; align-items: center; gap: 12px;
            padding: 14px 16px; cursor: pointer; transition: background 0.2s;
            &:hover { background: #f5f5f5; }
            &.active { background: #e3f2fd; }
            &.unread { background: #fff3e0; }
            
            .avatar {
              width: 44px; height: 44px; border-radius: 50%;
              background: linear-gradient(135deg, #6C5CE7, #a29bfe);
              display: flex; align-items: center; justify-content: center;
              color: #fff; font-weight: 600; overflow: hidden; flex-shrink: 0;
              img { width: 100%; height: 100%; object-fit: cover; }
            }
            
            .conversation-info {
              flex: 1; min-width: 0;
              h4 { margin: 0 0 4px; font-size: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
              .last-message { margin: 0; font-size: 13px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
              .mission-ref { margin: 4px 0 0; font-size: 12px; color: #999; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            }
            
            .meta {
              display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;
              .time { font-size: 11px; color: #999; }
              .unread-badge {
                background: #ef4444; color: #fff; font-size: 11px; font-weight: 600;
                padding: 2px 8px; border-radius: 10px;
              }
            }
          }
        }
        
        .empty-sidebar {
          text-align: center; padding: 40px 16px; color: #999;
          mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; }
        }
      }
      
      .chat-area {
        flex: 1; display: flex; flex-direction: column;
        min-width: 0; max-width: 100%; min-height: 0; overflow: hidden;
        
        .chat-header {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; background: #fff; border-bottom: 1px solid #e0e0e0;
          min-width: 0; flex-shrink: 0;
          
          &.placeholder { color: #999; }
          
          .user-info {
            flex: 1; display: flex; align-items: center; gap: 12px; min-width: 0;
            .avatar.small {
              width: 40px; height: 40px; font-size: 14px;
              border-radius: 50%; overflow: hidden; flex-shrink: 0;
              background: linear-gradient(135deg, #16a34a, #0d9488);
              display: flex; align-items: center; justify-content: center;
              color: #fff; font-weight: 600;
              img { width: 100%; height: 100%; object-fit: cover; display: block; }
            }
            h4 { margin: 0 0 2px; font-size: clamp(14px, 3.5vw, 16px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .mission-title { font-size: 12px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
          }
        }
        
        .messages-container {
          flex: 1; overflow-y: auto; overflow-x: hidden; padding: 12px 14px;
          min-width: 0; min-height: 0; -webkit-overflow-scrolling: touch;
          .loading-messages { display: flex; justify-content: center; padding: 40px; }
          
          .messages-list {
            display: flex; flex-direction: column; gap: 12px;
            
            .message {
              display: flex; gap: 10px;
              &.own { flex-direction: row-reverse; }
              &.system { justify-content: center; }
              
              .message-avatar {
                width: 32px; height: 32px; border-radius: 50%;
                background: linear-gradient(135deg, #6C5CE7, #a29bfe);
                display: flex; align-items: center; justify-content: center;
                color: #fff; font-size: 11px; font-weight: 600; overflow: hidden; flex-shrink: 0;
                img { width: 100%; height: 100%; object-fit: cover; }
              }
              
              .message-content {
                max-width: min(78%, 520px);
                min-width: 0;
                word-break: break-word;
                overflow-wrap: anywhere;
                .bubble {
                  background: #fff; padding: 10px 14px; border-radius: 18px;
                  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                  &.image { padding: 4px; overflow: hidden; }
                  img { max-width: 100%; max-height: min(40vh, 240px); width: auto; object-fit: contain; border-radius: 14px; cursor: pointer; display: block; }
                  p { margin: 0; line-height: 1.5; font-size: clamp(13px, 3.5vw, 15px); }
                  
                  .location-message {
                    display: flex; align-items: center; gap: 8px;
                    background: #e3f2fd; padding: 8px 12px; border-radius: 12px;
                    mat-icon { color: #2196f3; flex-shrink: 0; }
                  }
                  
                  .system-text {
                    font-style: italic; color: #666; font-size: 13px;
                    background: #f5f5f5; padding: 8px 16px; border-radius: 16px;
                  }
                }
                &.own .bubble { background: #3CB371; color: #fff; }
                
                .timestamp {
                  display: block; font-size: 11px; color: #999; margin-top: 4px;
                  text-align: right;
                }
              }
            }
          }
        }
        
        .no-conversation {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; color: #999; padding: 24px; text-align: center;
          mat-icon { font-size: 64px; width: 64px; height: 64px; margin-bottom: 16px; }
        }
        
        .input-area {
          padding: 10px 12px; background: #fff; border-top: 1px solid #e0e0e0;
          min-width: 0; max-width: 100%; box-sizing: border-box; flex-shrink: 0;
          padding-bottom: max(10px, env(safe-area-inset-bottom));

          .chat-closed {
            text-align: center; color: #6b7280; font-size: 13px; margin: 0;
          }
          
          .input-container {
            display: flex; align-items: center; gap: 6px;
            min-width: 0; width: 100%;
            
            .attach-btn { color: #666; flex-shrink: 0; }
            
            .message-input {
              flex: 1 1 0%;
              min-width: 0;
              width: auto;
              ::ng-deep .mat-mdc-form-field { width: 100%; }
              ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
              ::ng-deep .mat-mdc-text-field-wrapper { padding: 0 12px; }
              input { font-size: 15px; }
            }
            
            .send-btn {
              width: 44px; height: 44px; flex-shrink: 0;
              mat-icon { margin: 0; }
            }
          }
        }
      }
    }
    
    @media (max-width: 768px) {
      .chat-container {
        height: calc(100dvh - 56px);
        height: calc(100vh - 56px);
      }
      .chat-container:not(.sidebar-open) .conversations-sidebar { display: none; }
      .chat-container.sidebar-open .chat-area { display: none; }
      .conversations-sidebar { width: 100% !important; border-right: none; }
      .chat-container.embedded {
        height: 100%;
        min-height: 260px;
      }
      .chat-container .message .message-content { max-width: 88%; }
      .chat-container .message .message-avatar { display: none; }
      .chat-container .input-area { padding: 8px 10px; padding-bottom: max(8px, env(safe-area-inset-bottom)); }
      .chat-container .messages-container { padding: 10px; }
      .chat-container .send-btn { width: 40px; height: 40px; }
    }

    @media (max-width: 420px) {
      .chat-container .chat-header { padding: 8px 10px; }
      .chat-container .message .message-content { max-width: 92%; }
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy {
  @Input() missionId?: string;
  @Input() conversationId?: string;
  @Input() showSidebar = true;
  /** Mode carte (mission detail) : hauteur limitée, pas plein viewport */
  @Input() embedded = false;
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  
  private apiUrl = environment.apiUrl;
  private refreshSub?: Subscription;
  
  conversations: Conversation[] = [];
  currentConversation: Conversation | null = null;
  messages: Message[] = [];
  newMessage = '';
  
  loading = true;
  loadingMessages = false;
  sending = false;
  currentUserId: string | null = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUser()?.id || null;
    
    this.route.params.subscribe(params => {
      this.missionId = params['missionId'] || this.missionId;
      this.conversationId = params['conversationId'] || this.conversationId;
      this.loadConversations();
    });
    
    // Rafraîchir les messages toutes les 5 secondes
    this.refreshSub = interval(5000).subscribe(() => {
      if (this.currentConversation) {
        this.loadMessages(this.currentConversation.id, false);
      }
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  private h(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadConversations(): void {
    this.loading = true;
    let url = `${this.apiUrl}/chat/conversations/`;
    if (this.missionId) {
      url += `?mission_id=${this.missionId}`;
    }
    this.http.get<any>(url, { headers: this.h() }).subscribe({
      next: (res) => {
        this.conversations = res.results || res;
        this.loading = false;
        
        // Sélectionner automatiquement si conversationId ou missionId fourni
        if (this.conversationId) {
          const conv = this.conversations.find(c => c.id === this.conversationId);
          if (conv) this.selectConversation(conv);
        } else if (this.missionId) {
          const conv = this.conversations.find(c => c.mission?.id === this.missionId);
          if (conv) this.selectConversation(conv);
        } else if (this.conversations.length > 0 && !this.currentConversation) {
          this.selectConversation(this.conversations[0]);
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Erreur chargement conversations', 'Fermer', { duration: 3000 });
      }
    });
  }

  selectConversation(conv: Conversation): void {
    this.currentConversation = conv;
    this.showSidebar = false;
    this.loadMessages(conv.id, true);
    
    // Marquer comme lu
    if (conv.unread_count > 0) {
      this.http.post(`${this.apiUrl}/chat/conversations/${conv.id}/mark-read/`, {}, { headers: this.h() }).subscribe(() => {
        conv.unread_count = 0;
      });
    }
  }

  loadMessages(conversationId: string, showLoading = true): void {
    if (showLoading) this.loadingMessages = true;
    this.http.get<any>(`${this.apiUrl}/chat/conversations/${conversationId}/messages/`, { headers: this.h() }).subscribe({
      next: (res) => {
        const newMessages = res.results || res;
        // Ajouter seulement les nouveaux messages
        const existingIds = new Set(this.messages.map(m => m.id));
        const uniqueNew = newMessages.filter((m: Message) => !existingIds.has(m.id));
        if (uniqueNew.length > 0 || showLoading) {
          this.messages = newMessages;
          this.scrollToBottom();
        }
        this.loadingMessages = false;
      },
      error: () => {
        this.loadingMessages = false;
      }
    });
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.currentConversation || this.sending || !this.canWrite()) return;
    
    this.sending = true;
    const content = this.newMessage.trim();
    this.newMessage = '';
    
    this.http.post(`${this.apiUrl}/chat/conversations/${this.currentConversation.id}/messages/`, {
      content,
      message_type: 'text'
    }, { headers: this.h() }).subscribe({
      next: (msg: any) => {
        this.sending = false;
        this.messages.push(msg);
        this.scrollToBottom();
        
        // Mettre à jour la conversation dans la liste
        const conv = this.conversations.find(c => c.id === this.currentConversation!.id);
        if (conv) {
          conv.last_message = msg;
          conv.updated_at = new Date().toISOString();
        }
      },
      error: () => {
        this.sending = false;
        this.snackBar.open('Erreur envoi message', 'Fermer', { duration: 3000 });
      }
    });
  }

  isOwnMessage(msg: Message): boolean {
    return msg.sender.id === this.currentUserId;
  }

  canWrite(): boolean {
    const conv = this.currentConversation as Conversation & { can_write?: boolean; is_closed?: boolean };
    if (conv?.is_closed) return false;
    if (conv?.can_write === false) return false;
    const status = conv?.mission?.status;
    return !status || ['in_progress', 'submitted', 'disputed'].includes(status);
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  scrollToBottom(): void {
    setTimeout(() => {
      if (this.messagesContainer) {
        const el = this.messagesContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    }, 100);
  }

  getMissionRoute(): string {
    const user = this.authService.getCurrentUser();
    const role = user?.active_role || user?.user_type || 'client';
    return `/${role}/missions/${this.missionId || this.currentConversation?.mission?.id}`;
  }

  attachFile(): void {
    this.snackBar.open('Fonctionnalité à venir', 'Fermer', { duration: 2000 });
  }

  viewImage(url?: string): void {
    if (url) window.open(url, '_blank');
  }
}
