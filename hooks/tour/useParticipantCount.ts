import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useParticipantCount = (tourId: string | null) => {
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    if (!tourId) return;

    console.log('Setting up participant count subscription for tour:', tourId);

    // Initial fetch
    const fetchParticipantCount = async () => {
      console.log('Fetching participant count for tour:', tourId);
      const { data, error } = await supabase
        .from('tours')
        .select('current_participants')
        .eq('id', tourId)
        .single();
      
      if (!error && data) {
        console.log('Participant count updated:', data.current_participants);
        setParticipantCount(data.current_participants || 0);
      } else if (error) {
        console.error('Error fetching participant count:', error);
      }
    };

    // Initial fetch
    fetchParticipantCount();

    // Set up real-time subscription for the tours table
    const channel = supabase.channel(`tour-participants-${tourId}`);
    
    // Subscribe to UPDATE events on the tours table
    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tours',
          filter: `id=eq.${tourId}`
        },
        (payload) => {
          console.log('Tour updated:', payload);
          // Update the count directly from the payload
          if (payload.new && 'current_participants' in payload.new) {
            console.log('Current participants updated:', payload.new.current_participants);
            setParticipantCount(payload.new.current_participants || 0);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up participant count subscription for tour:', tourId);
      channel.unsubscribe();
    };
  }, [tourId]);

  return participantCount;
}; 