import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';

export default function JoinOrg() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, refreshMemberships } = useAuthContext();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'joined' | 'error'>('loading');

  useEffect(() => {
    if (!slug) return;
    // Look up org by slug
    supabase
      .from('organizations')
      .select('id, name')
      .eq('slug', slug)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setStatus('error');
        } else {
          setOrgName(data.name);
          setOrgId(data.id);
          setStatus('ready');
        }
      });
  }, [slug]);

  useEffect(() => {
    if (!authLoading && !user && status === 'ready') {
      // Redirect to auth with return URL
      navigate(`/auth?redirect=/join/${slug}`);
    }
  }, [user, authLoading, status, slug, navigate]);

  const handleJoin = async () => {
    if (!user || !orgId) return;
    setStatus('loading');

    const { error } = await supabase
      .from('organization_members')
      .insert({ user_id: user.id, organization_id: orgId, role: 'member' });

    if (error) {
      if (error.code === '23505') {
        toast.info('Vous êtes déjà membre de cette organisation');
        setStatus('joined');
      } else {
        toast.error('Erreur lors de la demande');
        setStatus('error');
      }
    } else {
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

        // Update profile org if it was pointing to default
        await supabase
          .from('profiles')
          .update({ organization_id: orgId })
          .eq('user_id', user.id)
          .eq('organization_id', defaultOrg.id);
      }

      toast.success('Vous avez rejoint l\'organisation !');
      refreshMemberships();
      setStatus('joined');
    }
  };

  if (authLoading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Rejoindre {orgName || 'une organisation'} | SCorp-io</title>
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-xl bg-primary flex items-center justify-center mb-4">
              <Building2 className="h-7 w-7 text-primary-foreground" />
            </div>
            {status === 'error' ? (
              <>
                <CardTitle className="flex items-center justify-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  Lien invalide
                </CardTitle>
                <CardDescription>Cette organisation n'existe pas ou le lien a expiré.</CardDescription>
              </>
            ) : status === 'joined' ? (
              <>
                <CardTitle className="flex items-center justify-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Bienvenue !
                </CardTitle>
                <CardDescription>Vous avez rejoint {orgName}.</CardDescription>
              </>
            ) : (
              <>
                <CardTitle>Rejoindre {orgName}</CardTitle>
                <CardDescription>Vous avez été invité à rejoindre cette organisation.</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent className="flex justify-center">
            {status === 'ready' && (
              <Button onClick={handleJoin} size="lg">
                Rejoindre {orgName}
              </Button>
            )}
            {(status === 'joined' || status === 'error') && (
              <Button onClick={() => navigate('/')} variant="outline">
                Retour au tableau de bord
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
