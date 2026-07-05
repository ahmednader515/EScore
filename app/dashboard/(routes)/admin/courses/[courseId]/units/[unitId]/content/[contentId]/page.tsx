import ContentItemEditorPage from "@/app/dashboard/_components/content-item-editor-page";

export default async function AdminContentItemPage({
  params,
}: {
  params: Promise<{ courseId: string; unitId: string; contentId: string }>;
}) {
  return (
    <ContentItemEditorPage params={params} basePath="/dashboard/admin" />
  );
}
