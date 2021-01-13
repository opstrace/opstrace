import { worker } from '../monaco-typescript-4.1.1/fillers/monaco-editor-core';
import { TypeScriptWorker, ICreateData } from "../monaco-typescript-4.1.1/tsWorker";

export class OpstraceModuleWorker extends TypeScriptWorker {

	constructor(ctx: worker.IWorkerContext, createData: ICreateData) {
		const compilerOptions = {...createData.compilerOptions,
			jsx: 1,
			allowJs: true,
			allowNonTsExtensions: true,
			target: 2,
			moduleResolution: 2,
			lib: ["es6"],
			noImplicitAny: true,
			noImplicitThis: true,
			declaration: true
		}
		super(ctx, {...createData, compilerOptions});
	}
}

export function create(ctx: worker.IWorkerContext, createData: ICreateData): TypeScriptWorker {
	return new OpstraceModuleWorker(ctx, createData);
}
