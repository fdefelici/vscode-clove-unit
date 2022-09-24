import { ChildProcess, exec, ExecException } from "child_process";
import { platform } from "os";
import * as vscode from "vscode";
//import { path } from "path";
export class Executor {

    public static exec(command: string, cwd : string, callback: (error: ExecException | null, stdout: string) => void) {
        const process = exec(command, {encoding: "utf8", maxBuffer: 5120000, cwd}, callback);
        return process;
    }

    public static aexec(command: string,  cwd: string) : Promise<string> {
        return new Promise<string>( (resolve, reject) => {
            Executor.exec(command, cwd, (err: ExecException | null, stdout: string) => {
                if (err) {
                    reject(new Error(`Failing executing command: "${command}" at cwd: "${cwd}" with exit code (${err.code})`));
                }
                else {
                    resolve(stdout);
                }
            });
        });
    }
}