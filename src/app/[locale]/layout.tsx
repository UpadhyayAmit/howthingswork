import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getMessages } from "next-intl/server";
import { routing } from "@/i18n/routing";
import ThemeProvider from "../_components/ThemeProvider";
import Sidebar from "../_components/Sidebar";
import LocaleSwitcher from "../_components/LocaleSwitcher";
import ResizableLayout from "../_components/ResizableLayout";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: {
    default: "How Things Work",
    template: "%s | How Things Work",
  },
  description:
    "Visual, interactive explanations of how technologies work under the hood.",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider>
        <ResizableLayout sidebar={<Sidebar />}>
          {/* Floating top controls - Responsive Positioning */}
          <div className="absolute top-4 right-4 lg:right-10 z-[100]">
            <LocaleSwitcher />
          </div>

          <main className="flex-1 flex flex-col relative overflow-hidden h-full">
            <div className="flex-1 overflow-y-auto w-full p-4 pb-20 lg:p-10 lg:pb-24">
              <div className="w-full h-full max-w-[100vw] overflow-x-hidden">
                {children}
              </div>
            </div>
          </main>
        </ResizableLayout>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
