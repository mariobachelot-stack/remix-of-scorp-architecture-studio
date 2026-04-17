import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Settings, Database, Factory, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EquipmentListAdmin } from '@/components/admin/EquipmentListAdmin';
import { EquipmentFormDialog } from '@/components/admin/EquipmentFormDialog';
import { ManufacturerListAdmin } from '@/components/admin/ManufacturerListAdmin';
import { ProductReferenceListAdmin } from '@/components/admin/ProductReferenceListAdmin';
import { useEquipmentLibrary } from '@/hooks/useEquipmentLibrary';

export default function EquipmentAdmin() {
  const [activeTab, setActiveTab] = useState('equipment');
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);

  const { 
    equipment, 
    isLoading: equipmentLoading,
  } = useEquipmentLibrary();

  const handleEditEquipment = (id: string) => {
    setEditingEquipmentId(id);
    setIsEquipmentDialogOpen(true);
  };

  const handleNewEquipment = () => {
    setEditingEquipmentId(null);
    setIsEquipmentDialogOpen(true);
  };

  const handleCloseEquipmentDialog = () => {
    setIsEquipmentDialogOpen(false);
    setEditingEquipmentId(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center gap-4 px-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour à l'éditeur
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Administration de la bibliothèque</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="equipment" className="gap-2">
                <Database className="h-4 w-4" />
                Équipements
              </TabsTrigger>
              <TabsTrigger value="manufacturers" className="gap-2">
                <Factory className="h-4 w-4" />
                Constructeurs
              </TabsTrigger>
              <TabsTrigger value="references" className="gap-2">
                <Tag className="h-4 w-4" />
                Références
              </TabsTrigger>
            </TabsList>

            {activeTab === 'equipment' && (
              <Button onClick={handleNewEquipment} className="gap-2">
                <Plus className="h-4 w-4" />
                Nouvel équipement
              </Button>
            )}
          </div>

          <TabsContent value="equipment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bibliothèque d'équipements</CardTitle>
                <CardDescription>
                  Gérez les équipements disponibles dans l'éditeur de schémas. 
                  Les modifications sont sauvegardées automatiquement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EquipmentListAdmin 
                  equipment={equipment}
                  isLoading={equipmentLoading}
                  onEdit={handleEditEquipment}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manufacturers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Constructeurs</CardTitle>
                <CardDescription>
                  Gérez les constructeurs disponibles par type d'équipement.
                  Ces listes sont utilisées pour filtrer les références produit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ManufacturerListAdmin />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="references" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Références produit</CardTitle>
                <CardDescription>
                  Gérez les références produit par constructeur et type d'équipement.
                  Ces références peuvent être associées aux équipements de la bibliothèque.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductReferenceListAdmin />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogs */}
      <EquipmentFormDialog 
        open={isEquipmentDialogOpen}
        onOpenChange={handleCloseEquipmentDialog}
        editingId={editingEquipmentId}
      />
    </div>
  );
}
