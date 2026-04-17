import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EquipmentReference {
  id: string;
  reference: string;
  description: string | null;
}

export const useEquipmentReferences = () => {
  const [references, setReferences] = useState<EquipmentReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReferences = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('equipment_references')
        .select('id, reference, description')
        .order('reference', { ascending: true });

      if (fetchError) throw fetchError;
      setReferences(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching references:', err);
      setError('Erreur lors du chargement des références');
    } finally {
      setLoading(false);
    }
  }, []);

  const addReference = useCallback(async (reference: string, description?: string): Promise<EquipmentReference | null> => {
    try {
      // Check if reference already exists
      const existing = references.find(r => r.reference.toLowerCase() === reference.toLowerCase());
      if (existing) return existing;

      const { data, error: insertError } = await supabase
        .from('equipment_references')
        .insert({ reference: reference.trim(), description: description || null })
        .select('id, reference, description')
        .single();

      if (insertError) {
        // Handle unique constraint violation
        if (insertError.code === '23505') {
          // Reference already exists, fetch and return it
          const { data: existingData } = await supabase
            .from('equipment_references')
            .select('id, reference, description')
            .eq('reference', reference.trim())
            .maybeSingle();
          if (existingData) {
            setReferences(prev => {
              if (prev.some(r => r.id === existingData.id)) return prev;
              return [...prev, existingData].sort((a, b) => a.reference.localeCompare(b.reference));
            });
            return existingData;
          }
        }
        throw insertError;
      }

      if (data) {
        setReferences(prev => [...prev, data].sort((a, b) => a.reference.localeCompare(b.reference)));
        return data;
      }
      return null;
    } catch (err) {
      console.error('Error adding reference:', err);
      return null;
    }
  }, [references]);

  useEffect(() => {
    fetchReferences();
  }, [fetchReferences]);

  return {
    references,
    loading,
    error,
    addReference,
    refetch: fetchReferences,
  };
};