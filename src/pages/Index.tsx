import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DiagramProvider, useDiagram } from '@/contexts/DiagramContext';
import { Dashboard } from '@/components/Dashboard';
import { DiagramEditor } from '@/components/DiagramEditor';
import { Helmet } from 'react-helmet-async';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const IndexContent = () => {
  const navigate = useNavigate();
  const { user, isLoading, canEdit } = useAuthContext();
  const { currentDiagram, closeDiagram } = useDiagram();
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleOpenEditor = () => {
    if (canEdit) {
      setView('editor');
    }
  };

  const handleBack = () => {
    closeDiagram();
    setView('dashboard');
  };

  // If we have a current diagram open and user can edit, show editor
  if (view === 'editor' && currentDiagram && canEdit) {
    return <DiagramEditor onBack={handleBack} />;
  }

  return <Dashboard onOpenEditor={handleOpenEditor} />;
};

const Index = () => {
  return (
    <>
      <Helmet>
        <title>SCorp-io Architecture Builder | Créateur de schémas GTB</title>
        <meta 
          name="description" 
          content="Créez rapidement des schémas d'architecture GTB professionnels pour vos propositions commerciales. Visualisez les interfaces, protocoles et connexions cloud."
        />
      </Helmet>
      <DiagramProvider>
        <IndexContent />
      </DiagramProvider>
    </>
  );
};

export default Index;
