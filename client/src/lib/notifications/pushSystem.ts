export interface NotificationData {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  tag?: string;
}

export interface SocialTrigger {
  type: 'friend_beat_score' | 'friend_joined' | 'achievement_unlocked' | 'leaderboard_position' | 'daily_challenge';
  friendFid?: number;
  friendUsername?: string;
  score?: number;
  achievement?: string;
  position?: number;
}

export class PushNotificationSystem {
  private static instance: PushNotificationSystem;
  private notificationToken: string | null = null;

  static getInstance(): PushNotificationSystem {
    if (!PushNotificationSystem.instance) {
      PushNotificationSystem.instance = new PushNotificationSystem();
    }
    return PushNotificationSystem.instance;
  }

  async initialize(): Promise<boolean> {
    try {
      // Check if running in Mini App context
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  async generateNotificationToken(userFid: number): Promise<string | null> {
    try {
      // In a real implementation, this would generate a unique token
      // and register it with Neynar's notification system
      const token = `galaxiga_${userFid}_${Date.now()}`;
      this.notificationToken = token;
      
      // Register with backend webhook system
      await this.registerWebhook(userFid, token);
      
      return token;
    } catch (error) {
      console.error('Failed to generate notification token:', error);
      return null;
    }
  }

  private async registerWebhook(userFid: number, token: string): Promise<void> {
    try {
      // This would register the webhook with your backend
      const response = await fetch('/api/notifications/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userFid, token }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to register webhook');
      }
      
      console.log('Notification webhook registered successfully');
    } catch (error) {
      console.error('Webhook registration failed:', error);
    }
  }

  async sendSocialTriggerNotification(userFid: number, trigger: SocialTrigger): Promise<boolean> {
    try {
      const notification = this.createNotificationFromTrigger(trigger);
      
      // Send to Neynar notification system
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userFid,
          notification,
          trigger,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send social trigger notification:', error);
      return false;
    }
  }

  private createNotificationFromTrigger(trigger: SocialTrigger): NotificationData {
    switch (trigger.type) {
      case 'friend_beat_score':
        return {
          title: '🏆 You\'ve been overtaken!',
          body: `@${trigger.friendUsername} just beat your high score with ${trigger.score?.toLocaleString()} points!`,
          icon: '/rocket.png',
          tag: 'friend-beat-score',
          data: { type: trigger.type, friendFid: trigger.friendFid }
        };

      case 'friend_joined':
        return {
          title: '🚀 Friend joined the battle!',
          body: `@${trigger.friendUsername} just started playing Galaxiga. Challenge them to beat your score!`,
          icon: '/spaceship.png',
          tag: 'friend-joined',
          data: { type: trigger.type, friendFid: trigger.friendFid }
        };

      case 'achievement_unlocked':
        return {
          title: '🏆 Achievement Unlocked!',
          body: `You've earned the "${trigger.achievement}" achievement! Claim your rewards now.`,
          icon: '/spaceship.png',
          tag: 'achievement',
          data: { type: trigger.type, achievement: trigger.achievement }
        };

      case 'leaderboard_position':
        return {
          title: '📊 Leaderboard Update',
          body: `You're now ranked #${trigger.position} among your friends! Keep climbing!`,
          icon: '/rocket.png',
          tag: 'leaderboard',
          data: { type: trigger.type, position: trigger.position }
        };

      case 'daily_challenge':
        return {
          title: '⭐ Daily Challenge Available',
          body: 'New daily challenge is live! Complete it for exclusive rewards.',
          icon: '/spaceship.png',
          tag: 'daily-challenge',
          data: { type: trigger.type }
        };

      default:
        return {
          title: '🎮 Galaxiga',
          body: 'Something exciting happened in your space adventure!',
          icon: '/rocket.png',
          tag: 'generic'
        };
    }
  }

  async sendLocalNotification(notification: NotificationData): Promise<boolean> {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.body,
          icon: notification.icon || '/rocket.png',
          badge: notification.badge || '/rocket.png',
          tag: notification.tag,
          data: notification.data,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to send local notification:', error);
      return false;
    }
  }

  // Analytics for notification engagement
  async trackNotificationOpen(notificationId: string, userFid: number): Promise<void> {
    try {
      await fetch('/api/notifications/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'notification_opened',
          notificationId,
          userFid,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to track notification open:', error);
    }
  }

  // Smart notification timing to avoid spam
  private lastNotificationTime = new Map<string, number>();
  
  shouldSendNotification(type: string, userFid: number, cooldownMinutes = 15): boolean {
    const key = `${userFid}_${type}`;
    const lastTime = this.lastNotificationTime.get(key) || 0;
    const cooldownMs = cooldownMinutes * 60 * 1000;
    
    if (Date.now() - lastTime > cooldownMs) {
      this.lastNotificationTime.set(key, Date.now());
      return true;
    }
    
    return false;
  }
}