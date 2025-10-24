"use client";

import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { motion } from 'framer-motion';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs = ({ items, className = '' }: BreadcrumbsProps) => {
  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Link
          href="/dashboard"
          className="flex items-center text-text-tertiary hover:text-text-primary transition-colors"
        >
          <Home className="w-4 h-4" />
          <span className="sr-only">Home</span>
        </Link>
      </motion.div>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <motion.div
            key={index}
            className="flex items-center space-x-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.1 * (index + 1) }}
          >
            <ChevronRight className="w-4 h-4 text-text-muted" />
            
            {isLast ? (
              <span className="flex items-center text-text-primary font-medium" aria-current="page">
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href || '#'}
                className="flex items-center text-text-tertiary hover:text-text-primary transition-colors"
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label}
              </Link>
            )}
          </motion.div>
        );
      })}
    </nav>
  );
};
