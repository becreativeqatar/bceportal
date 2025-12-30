'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Pencil, Trash2, Hash, Package, FileText, Save, AlertTriangle } from 'lucide-react';

interface DocumentNumberConfig {
  id: string;
  entityType: string;
  entityLabel: string;
  code: string;
  description: string | null;
  includeMonth: boolean;
  sequenceDigits: number;
  isAssetCategory: boolean;
  isSystemRequired: boolean;
  isActive: boolean;
}

interface FormData {
  entityLabel: string;
  code: string;
  description: string;
  includeMonth: boolean;
  sequenceDigits: number;
  isActive: boolean;
}

const emptyForm: FormData = {
  entityLabel: '',
  code: '',
  description: '',
  includeMonth: false,
  sequenceDigits: 3,
  isActive: true,
};

export function DocumentNumberingSettings() {
  const [configs, setConfigs] = useState<DocumentNumberConfig[]>([]);
  const [companyPrefix, setCompanyPrefix] = useState('BCE');
  const [editingPrefix, setEditingPrefix] = useState('BCE');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrefixSaving, setIsPrefixSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<DocumentNumberConfig | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<DocumentNumberConfig | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/document-config');
      const data = await res.json();
      setConfigs(data.configs || []);
      setCompanyPrefix(data.companyPrefix || 'BCE');
      setEditingPrefix(data.companyPrefix || 'BCE');
    } catch (error) {
      console.error('Failed to fetch document configs:', error);
      toast.error('Failed to load document numbering settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const openEditDialog = (config: DocumentNumberConfig) => {
    setEditingConfig(config);
    setFormData({
      entityLabel: config.entityLabel,
      code: config.code,
      description: config.description || '',
      includeMonth: config.includeMonth,
      sequenceDigits: config.sequenceDigits,
      isActive: config.isActive,
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (config: DocumentNumberConfig) => {
    setDeletingConfig(config);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      toast.error('Code is required');
      return;
    }

    if (!/^[A-Z]{2}$/.test(formData.code)) {
      toast.error('Code must be exactly 2 uppercase letters');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/document-config/${editingConfig?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      toast.success('Configuration updated');
      setIsDialogOpen(false);
      fetchConfigs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingConfig) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/document-config/${deletingConfig.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      toast.success('Configuration deleted');
      setIsDeleteDialogOpen(false);
      setDeletingConfig(null);
      fetchConfigs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrefixSave = async () => {
    if (!/^[A-Z]{2,10}$/.test(editingPrefix)) {
      toast.error('Prefix must be 2-10 uppercase letters');
      return;
    }

    setIsPrefixSaving(true);
    try {
      const res = await fetch('/api/admin/document-config/prefix', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: editingPrefix }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      setCompanyPrefix(editingPrefix);
      toast.success('Company prefix updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save prefix');
    } finally {
      setIsPrefixSaving(false);
    }
  };

  // Generate format preview
  const getFormatPreview = (config: DocumentNumberConfig) => {
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const seq = '001'.padStart(config.sequenceDigits, '0');

    if (config.includeMonth) {
      return `${companyPrefix}-${config.code}-${year}${month}${seq}`;
    }
    return `${companyPrefix}-${config.code}-${year}${seq}`;
  };

  const documentTypes = configs.filter((c) => !c.isAssetCategory);
  const assetCategories = configs.filter((c) => c.isAssetCategory);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading document numbering settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderConfigRow = (config: DocumentNumberConfig) => (
    <div
      key={config.id}
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
    >
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{config.entityLabel}</span>
          <Badge variant="outline" className="font-mono text-xs">
            {config.code}
          </Badge>
          {config.isSystemRequired && (
            <Badge variant="secondary" className="text-xs">
              System
            </Badge>
          )}
          {!config.isActive && (
            <Badge variant="destructive" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-sm text-muted-foreground font-mono">
            {getFormatPreview(config)}
          </span>
          {config.description && (
            <span className="text-sm text-muted-foreground">
              - {config.description}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => openEditDialog(config)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => openDeleteDialog(config)}
          disabled={config.isSystemRequired}
          title={config.isSystemRequired ? 'System configurations cannot be deleted' : 'Delete'}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Document Numbering
              </CardTitle>
              <CardDescription>
                Configure BCE document numbering codes for all entities in the system
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Prefix */}
          <div className="p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Company Prefix</h3>
                <p className="text-sm text-muted-foreground">
                  The prefix used for all document numbers (e.g., BCE-XX-YYXXX)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={editingPrefix}
                  onChange={(e) => setEditingPrefix(e.target.value.toUpperCase())}
                  className="w-24 font-mono text-center"
                  maxLength={10}
                />
                <Button
                  size="sm"
                  onClick={handlePrefixSave}
                  disabled={isPrefixSaving || editingPrefix === companyPrefix}
                >
                  {isPrefixSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Tabs for Document Types and Asset Categories */}
          <Tabs defaultValue="documents" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="documents" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Document Types ({documentTypes.length})
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Asset Categories ({assetCategories.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="space-y-2">
              {documentTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No document type configurations found. Run database seed to create defaults.
                </p>
              ) : (
                documentTypes.map(renderConfigRow)
              )}
            </TabsContent>

            <TabsContent value="assets" className="space-y-2">
              {assetCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No asset category configurations found. Run database seed to create defaults.
                </p>
              ) : (
                assetCategories.map(renderConfigRow)
              )}
            </TabsContent>
          </Tabs>

          {/* Format Legend */}
          <div className="p-4 border rounded-lg bg-blue-50 text-blue-800">
            <h4 className="font-medium mb-2">Format Legend</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><code className="bg-blue-100 px-1 rounded">{companyPrefix}</code> - Company prefix</div>
              <div><code className="bg-blue-100 px-1 rounded">XX</code> - 2-letter code</div>
              <div><code className="bg-blue-100 px-1 rounded">YY</code> - 2-digit year</div>
              <div><code className="bg-blue-100 px-1 rounded">MM</code> - 2-digit month (optional)</div>
              <div><code className="bg-blue-100 px-1 rounded">XXX</code> - Sequential number</div>
              <div><code className="bg-blue-100 px-1 rounded">00</code> - Year for transferred assets</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Configuration</DialogTitle>
            <DialogDescription>
              Update the document numbering configuration for {editingConfig?.entityLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="entityLabel">Label</Label>
              <Input
                id="entityLabel"
                value={formData.entityLabel}
                onChange={(e) => setFormData({ ...formData, entityLabel: e.target.value })}
                placeholder="e.g., Leave Request"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code (2 letters) *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., LV"
                className="font-mono"
                maxLength={2}
              />
              <p className="text-xs text-muted-foreground">
                Must be exactly 2 uppercase letters (A-Z). Must be unique within its category.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sequenceDigits">Sequence Digits</Label>
              <Input
                id="sequenceDigits"
                type="number"
                min={1}
                max={6}
                value={formData.sequenceDigits}
                onChange={(e) => setFormData({ ...formData, sequenceDigits: parseInt(e.target.value) || 3 })}
              />
              <p className="text-xs text-muted-foreground">
                Number of digits for sequential numbers (1-6)
              </p>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="includeMonth">Include Month in Format</Label>
              <Switch
                id="includeMonth"
                checked={formData.includeMonth}
                onCheckedChange={(checked) => setFormData({ ...formData, includeMonth: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>

            {/* Preview */}
            <div className="p-3 border rounded-lg bg-gray-50">
              <p className="text-sm text-muted-foreground mb-1">Preview:</p>
              <p className="font-mono text-lg">
                {companyPrefix}-{formData.code || 'XX'}-
                {formData.includeMonth
                  ? `${new Date().getFullYear().toString().slice(-2)}${(new Date().getMonth() + 1).toString().padStart(2, '0')}`
                  : new Date().getFullYear().toString().slice(-2)
                }
                {'0'.repeat(formData.sequenceDigits || 3).slice(0, -1)}1
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Configuration
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the configuration for &quot;{deletingConfig?.entityLabel}&quot;?
              This may affect document number generation for this entity.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
