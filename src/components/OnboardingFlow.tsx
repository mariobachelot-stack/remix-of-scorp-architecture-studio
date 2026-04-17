import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface OnboardingFlowProps {
  onComplete: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const { user, refreshMemberships } = useAuthContext();
  const [orgName, setOrgName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(orgName));
    }
  }, [orgName, slugManuallyEdited]);

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(slugify(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !slug.trim() || !user) return;

    setIsSubmitting(true);
    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName.trim(), slug: slug.trim() })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add user as org_admin
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          user_id: user.id,
          organization_id: org.id,
          role: 'org_admin' as any,
        });

      if (memberError) throw memberError;

      // Remove from default "Aucune" organization
      const { data: defaultOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('is_default', true)
        .maybeSingle();

      if (defaultOrg) {
        await supabase
          .from('organization_members')
          .delete()
          .eq('user_id', user.id)
          .eq('organization_id', defaultOrg.id);
      }

      // Update profile to point to new org
      await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('user_id', user.id);

      toast.success('Organisation créée 🎉');
      refreshMemberships();
      onComplete();
    } catch (error: any) {
      if (error?.code === '23505') {
        toast.error('Ce slug est déjà utilisé. Choisissez-en un autre.');
      } else {
        toast.error(`Erreur: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bienvenue sur SCorp-io</h1>
          <p className="text-muted-foreground mt-2">
            Créez votre organisation pour commencer à utiliser l'application.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Créer mon organisation</CardTitle>
            <CardDescription>
              Renseignez les informations de votre organisation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Nom de l'organisation *</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Mon entreprise"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Identifiant (slug)</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="mon-entreprise"
                />
                <p className="text-xs text-muted-foreground">
                  Utilisé pour les liens d'invitation : /join/{slug || '...'}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={!orgName.trim() || !slug.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                Créer et continuer
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
