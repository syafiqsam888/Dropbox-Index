import React from "react";
import Link from "next/link";
import { useDisclosure } from "@chakra-ui/hooks";
import { SearchIcon } from "@heroicons/react/solid";
import Head from "next/head";
import { Upload } from "./Upload";
import { useRouter } from "next/router";

interface NavProps {
  onUploadComplete?: () => void;
}

export const Nav = ({ onUploadComplete }: NavProps) => {
  const title = process.env.NEXT_PUBLIC_TITLE ?? "D-Index";
  const { isOpen, onToggle } = useDisclosure();
  const router = useRouter();
  
  // Get current path from router
  let currentPath = "";
  if (router.query.path) {
    if (Array.isArray(router.query.path)) {
      currentPath = router.query.path.join("/");
    } else {
      currentPath = router.query.path;
    }
  }
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <nav className="px-6 py-3 border-b-2 border-cyan-500 backdrop-blur-3xl sticky top-0">
        <div className="flex flex-row justify-between items-center max-w-screen-md mx-auto">
          <Link href={"/"} passHref={true}>
            <a>
              <h3 className="text-2xl font-semibold hover:text-shadow">
                {title}
              </h3>
            </a>
          </Link>
          
          {/* MD+ */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="input-group max-w-sm flex flex-row items-center overflow-hidden rounded-full">
              <input
                type="search"
                className={"form-control h-10 p-2 w-full rounded-l-full"}
                placeholder="Search"
              />
              <SearchIcon className="bg-cyan-500 w-12 h-10 p-2" />
            </div>
            <Upload currentPath={currentPath} onUploadComplete={onUploadComplete} />
          </div>
          
          {/* SM */}
          <div className="flex items-center space-x-2 md:hidden">
            <Upload currentPath={currentPath} onUploadComplete={onUploadComplete} />
            <div className="input-group overflow-hidden rounded-full">
              <SearchIcon
                className="bg-cyan-500 w-12 h-10 p-2"
                onClick={onToggle}
              />
            </div>
          </div>
        </div>
        {isOpen && (
          <input
            type="search"
            className="form-control h-10 p-2 w-full block md:hidden rounded-full mt-3 text-slate-900 px-4"
            placeholder="Search"
          />
        )}
      </nav>
    </>
  );
};
