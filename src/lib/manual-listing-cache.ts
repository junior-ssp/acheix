import { revalidatePath, revalidateTag } from "next/cache";

export function revalidateManualListingFeeds() {
  revalidateTag("acheix-manual-listings");
  revalidatePath("/");
  revalidatePath("/veiculos");
  revalidatePath("/imoveis");
  revalidatePath("/servicos");
  revalidatePath("/dashboard");
}
