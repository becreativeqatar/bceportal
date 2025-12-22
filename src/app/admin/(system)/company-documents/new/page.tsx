import { CompanyDocumentForm } from '@/components/domains/system/company-documents/CompanyDocumentForm';

export default function NewCompanyDocumentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Add Company Document</h1>
        <p className="text-muted-foreground">
          Add a new company or vehicle document for tracking
        </p>
      </div>

      <CompanyDocumentForm mode="create" />
    </div>
  );
}
