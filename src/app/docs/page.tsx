'use client';

import { useEffect } from 'react';

const SWAGGER_VERSION = '5.17.14';

/**
 * Swagger UI rendered from the OpenAPI spec at /api/v1/openapi.json. The UI
 * assets are loaded from a CDN at runtime to avoid bundling them.
 */
export default function DocsPage() {
  useEffect(() => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui.css`;
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = `https://unpkg.com/swagger-ui-dist@${SWAGGER_VERSION}/swagger-ui-bundle.js`;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      // @ts-expect-error injected global from the CDN bundle
      window.SwaggerUIBundle({
        url: '/api/v1/openapi.json',
        domNode: document.getElementById('swagger'),
        deepLinking: true,
      });
    };
    document.body.appendChild(script);

    return () => {
      css.remove();
      script.remove();
    };
  }, []);

  return <div id="swagger" style={{ background: '#fff', minHeight: '100vh' }} />;
}
