// Create the top-level elix.js and elix.d.ts files.


const fs = require('fs').promises;
const path = require('path');


async function createLibraryFiles(sourceFiles) {

  const header =
`/*
 * The complete set of Elix elements and mixins.
 * 
 * This file is the primary entry point to the Elix package, so its exports are
 * what is obtained if you write \`import * from 'elix'\`. However, you can opt
 * to ignore this file, and directly import the sources you want from the /src
 * folder.
 * 
 * This file is also used during testing, as it causes all Elix's elements to be
 * loaded.
 * 
 * NOTE: Do not edit this file by hand. This file is generated during
 * publishing, or you can regenerate it with \`npm run prepublishOnly\`.
 */`;

  const simpleExportFiles = [...sourceFiles.components, ...sourceFiles.mixins].sort();
  const simpleExports = simpleExportFiles.map(file => {
    const name = path.basename(file, '.js');
    return `export { default as ${name} } from './${file}';`
  }).join('\n');

  const helperFiles = sourceFiles.helpers;
  const helperJsExports = helperFiles.map(file => {
    const name = path.basename(file, '.js');
    return `import * as ${name}Import from './${file}';
export const ${name} = ${name}Import;`;
  }).join('\n');
  const helperTsExports = helperFiles.map(file => {
    const name = path.basename(file, '.js');
    return `import * as ${name} from './${file}';
export ${name};`;
  }).join('\n');

  const elixJsSource =
`${header}

// Files that export a single object.
${simpleExports}

// Files that export multiple objects.
// As of Sept 2019, there's no way to simultaneously import a collection of
// objects and then export them as a named object, so we have to do the import
// and export in separate steps.
${helperJsExports}
`;

  const elixTsSource =
`${header}

// Files that export a single object.
${simpleExports}

// Files that export multiple objects.
// As of Sept 2019, there's no way to simultaneously import a collection of
// objects and then export them as a named object, so we have to do the import
// and export in separate steps.
${helperTsExports}
`;

  const elixJsPath = path.join(__dirname, '../src/elix.js');
  fs.writeFile(elixJsPath, elixJsSource);
  const elixTsPath = path.join(__dirname, '../src/elix.d.ts');
  fs.writeFile(elixTsPath, elixTsSource);
}


module.exports = createLibraryFiles;