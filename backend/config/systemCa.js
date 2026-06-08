import tls from "node:tls";

let loaded = false;

export const addSystemCertificates = () => {
  if (
    loaded ||
    process.env.USE_SYSTEM_CA === "false" ||
    typeof tls.getCACertificates !== "function" ||
    typeof tls.setDefaultCACertificates !== "function"
  ) {
    return;
  }

  try {
    const defaultCertificates = tls.getCACertificates("default");
    const systemCertificates = tls.getCACertificates("system");
    tls.setDefaultCACertificates([...defaultCertificates, ...systemCertificates]);
    loaded = true;
  } catch (error) {
    console.warn(`Could not load system CA certificates: ${error.message}`);
  }
};
