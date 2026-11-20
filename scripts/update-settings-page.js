const fs = require('fs');

let file = fs.readFileSync('app/(dashboard)/settings/page.tsx', 'utf8');

if (!file.includes('StatutorySettingsSection')) {
  file = file.replace(
    'import { McpSection } from "../../../components/settings/McpSection";',
    'import { McpSection } from "../../../components/settings/McpSection";\r\nimport { StatutorySettingsSection } from "../../../components/settings/StatutorySettingsSection";\r\nimport { Scale } from "lucide-react";'
  );
}

file = file.replace(
  "type TabType = 'branding' | 'attendance' | 'email' | 'email-templates' | 'careers' | 'mcp';",
  "type TabType = 'branding' | 'attendance' | 'email' | 'email-templates' | 'careers' | 'mcp' | 'statutory';"
);

file = file.replace(
  "{ id: 'mcp', label: 'MCP & AI Agent', icon: Plug },",
  "{ id: 'mcp', label: 'MCP & AI Agent', icon: Plug },\r\n    { id: 'statutory', label: 'Statutory & Compliance', icon: Scale },"
);

file = file.replace(
  "{tab === 'careers' && (",
  "{tab === 'statutory' && (\r\n            <StatutorySettingsSection companyId={user.companyId || ''} />\r\n          )}\r\n\r\n          {tab === 'careers' && ("
);

fs.writeFileSync('app/(dashboard)/settings/page.tsx', file, 'utf8');
console.log('Successfully updated settings/page.tsx');
