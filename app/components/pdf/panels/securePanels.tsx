"use client";

import { formatFileSize } from "../../../lib/files";
import {
  changePermissions,
  decryptPdf,
  encryptPdf,
  linearizePdf,
  removeRestrictions,
  repairPdf,
  sanitizePdf,
  type EncryptionBits,
  type PermissionSettings,
} from "../../../features/pdf/services/securityOps";
import { createToolPanel, type ToolInputSpec } from "../ToolForm";

const SINGLE_PDF: ToolInputSpec = {
  kind: "single",
  batch: true,
  label: "Drop your PDF here",
  previews: true,
};

/** Encrypted files cannot be thumbnailed, so previews stay off. */
const ENCRYPTED_PDF: ToolInputSpec = {
  kind: "single",
  label: "Drop your PDF here",
  hint: "Password-protected files will not show a preview",
};

export const EncryptPanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    {
      kind: "text",
      name: "userPassword",
      label: "User password (to open)",
      default: "",
      placeholder: "Leave empty for no open password…",
    },
    {
      kind: "text",
      name: "ownerPassword",
      label: "Owner password (to change)",
      default: "",
      placeholder: "Defaults to the user password…",
    },
    {
      kind: "select",
      name: "bits",
      label: "Encryption strength",
      default: "256",
      options: [
        { label: "AES-256 (recommended)", value: "256" },
        { label: "AES-128", value: "128" },
        { label: "RC4-40 (legacy readers)", value: "40" },
      ],
    },
  ],
  actionLabel: "Encrypt",
  runningLabel: "Encrypting…",
  validate: ({ values }) =>
    !String(values.userPassword) && !String(values.ownerPassword)
      ? "Set a user password, an owner password, or both."
      : null,
  execute: async ({ files, values, report }) => {
    report(40);
    const out = await encryptPdf(
      files[0],
      String(values.userPassword),
      String(values.ownerPassword),
      values.bits as EncryptionBits,
    );
    return {
      blob: out.blob,
      filename: out.filename,
      description: `Encrypted with AES-${values.bits} · ${formatFileSize(out.blob.size)}.`,
      message: "Encryption complete.",
    };
  },
});

export const DecryptPanel = createToolPanel({
  input: ENCRYPTED_PDF,
  fields: [
    {
      kind: "text",
      name: "password",
      label: "Password",
      default: "",
      placeholder: "The password that opens this PDF…",
    },
  ],
  actionLabel: "Decrypt",
  runningLabel: "Decrypting…",
  execute: async ({ files, values, report }) => {
    report(40);
    const out = await decryptPdf(files[0], String(values.password));
    return {
      blob: out.blob,
      filename: out.filename,
      description: "Password removed. The file now opens without one.",
      message: "Decryption complete.",
    };
  },
});

export const PermissionsPanel = createToolPanel({
  input: SINGLE_PDF,
  fields: [
    {
      kind: "text",
      name: "ownerPassword",
      label: "Owner password (required)",
      default: "",
      placeholder: "Needed to enforce restrictions…",
    },
    {
      kind: "text",
      name: "userPassword",
      label: "User password (optional)",
      default: "",
      placeholder: "Leave empty so anyone can open it…",
    },
    {
      kind: "select",
      name: "print",
      label: "Printing",
      default: "full",
      options: [
        { label: "Allow", value: "full" },
        { label: "Low resolution only", value: "low" },
        { label: "Block", value: "none" },
      ],
    },
    {
      kind: "select",
      name: "modify",
      label: "Modification",
      default: "all",
      options: [
        { label: "Allow all", value: "all" },
        { label: "Annotations only", value: "annotate" },
        { label: "Form filling only", value: "form" },
        { label: "Page assembly only", value: "assembly" },
        { label: "Block", value: "none" },
      ],
    },
    {
      kind: "checkbox",
      name: "extract",
      label: "Allow copying text and images",
      default: true,
    },
    {
      kind: "checkbox",
      name: "annotate",
      label: "Allow adding comments and annotations",
      default: true,
    },
    {
      kind: "checkbox",
      name: "accessibility",
      label: "Allow screen readers to extract text",
      default: true,
    },
  ],
  actionLabel: "Apply permissions",
  runningLabel: "Applying…",
  validate: ({ values }) =>
    String(values.ownerPassword)
      ? null
      : "Set an owner password. Without one, anyone can remove the restrictions.",
  execute: async ({ files, values, report }) => {
    report(40);
    const permissions: PermissionSettings = {
      print: values.print as PermissionSettings["print"],
      modify: values.modify as PermissionSettings["modify"],
      extract: Boolean(values.extract),
      annotate: Boolean(values.annotate),
      accessibility: Boolean(values.accessibility),
    };
    const out = await changePermissions(
      files[0],
      String(values.ownerPassword),
      String(values.userPassword),
      permissions,
    );
    return {
      blob: out.blob,
      filename: out.filename,
      description: `Printing: ${permissions.print} · Modification: ${permissions.modify}.`,
      message: "Permissions applied.",
    };
  },
});

export const RepairPanel = createToolPanel({
  input: ENCRYPTED_PDF,
  actionLabel: "Repair",
  runningLabel: "Repairing…",
  execute: async ({ files, report }) => {
    report(40);
    const out = await repairPdf(files[0]);
    return {
      blob: out.blob,
      filename: out.filename,
      description: `Cross-reference table rebuilt · ${formatFileSize(out.blob.size)}.`,
      message: "Repair complete.",
    };
  },
});

export const LinearizePanel = createToolPanel({
  input: SINGLE_PDF,
  actionLabel: "Linearize",
  runningLabel: "Linearizing…",
  execute: async ({ files, report }) => {
    report(40);
    const out = await linearizePdf(files[0]);
    return {
      blob: out.blob,
      filename: out.filename,
      description: `Optimised for fast web view · ${formatFileSize(out.blob.size)}.`,
      message: "Linearization complete.",
    };
  },
});

export const RemoveRestrictionsPanel = createToolPanel({
  input: SINGLE_PDF,
  actionLabel: "Remove restrictions",
  runningLabel: "Removing…",
  execute: async ({ files, report }) => {
    report(40);
    const out = await removeRestrictions(files[0]);
    return {
      blob: out.blob,
      filename: out.filename,
      description: "Printing, copying, and editing limits lifted.",
      message: "Restrictions removed.",
    };
  },
});

export const SanitizePanel = createToolPanel({
  input: SINGLE_PDF,
  actionLabel: "Sanitize",
  runningLabel: "Sanitizing…",
  execute: async ({ files, report }) => {
    report(40);
    const out = await sanitizePdf(files[0]);
    const { report: removed } = out;
    const total =
      removed.javascript +
      removed.launchActions +
      removed.embeddedFiles +
      removed.openActions;
    return {
      blob: out.blob,
      filename: out.filename,
      description:
        total === 0
          ? "No active content found. The file was already clean."
          : `Removed ${removed.javascript} JavaScript, ${removed.launchActions} launch/submit, ${removed.embeddedFiles} attachment, and ${removed.openActions} auto-run entries.`,
      message: total === 0 ? "Nothing to remove." : `Removed ${total} items.`,
    };
  },
});
