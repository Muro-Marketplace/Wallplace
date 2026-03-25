import { redirect } from "next/navigation";

export default function GalleriesRedirect() {
  redirect("/browse?view=gallery");
}
