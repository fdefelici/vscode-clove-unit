export class CloveVersion {
    public static fromSemVerString(semVer : string) : CloveVersion | null {
        const semVerArray = semVer.split(".", 3);
        if (semVerArray.length != 3) return null;      
        const major = parseInt(semVerArray[0]);
        const minor = parseInt(semVerArray[1]);
        const patch = parseInt(semVerArray[2]);
        return new CloveVersion(major, minor, patch);
    }

    private readonly versionStr : string;

    constructor(
        private major : number,
        private minor : number,
        private patch : number,
    ) { 
        this.versionStr = "" + major + "." + minor + "." + patch;
    }
    
    public hasSameMinor(other : CloveVersion) : boolean {
        if (this.major != other.major) return false;
        if (this.minor != other.minor) return false;
        return true;
    }

    public asMinorString() {
        return "" + this.major + "." + this.minor + ".X";
    }

    public asString() {
        return this.versionStr;
    }
}