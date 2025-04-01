"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CheckInScanner;
var react_1 = require("react");
var button_1 = require("@/components/ui/button");
var use_toast_1 = require("@/hooks/use-toast");
var queryClient_1 = require("@/lib/queryClient");
var lucide_react_1 = require("lucide-react");
var card_1 = require("@/components/ui/card");
var badge_1 = require("@/components/ui/badge");
var input_1 = require("@/components/ui/input");
var select_1 = require("@/components/ui/select");
var tabs_1 = require("@/components/ui/tabs");
function CheckInScanner(_a) {
    var _this = this;
    var event = _a.event, onCheckInComplete = _a.onCheckInComplete;
    var _b = (0, react_1.useState)(""), manualCode = _b[0], setManualCode = _b[1];
    var _c = (0, react_1.useState)(false), isSubmitting = _c[0], setIsSubmitting = _c[1];
    var _d = (0, react_1.useState)(""), registrationId = _d[0], setRegistrationId = _d[1];
    var _e = (0, react_1.useState)([]), manualRegistrations = _e[0], setManualRegistrations = _e[1];
    var _f = (0, react_1.useState)(false), isLoadingRegistrations = _f[0], setIsLoadingRegistrations = _f[1];
    var _g = (0, react_1.useState)(null), scanResult = _g[0], setScanResult = _g[1];
    var toast = (0, use_toast_1.useToast)().toast;
    // Load registrations for this event
    var loadRegistrations = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, data, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setIsLoadingRegistrations(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch("/api/events/".concat(event.id, "/registrations"))];
                case 2:
                    response = _a.sent();
                    if (!response.ok) {
                        throw new Error("Failed to load registrations");
                    }
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    setManualRegistrations(data);
                    return [3 /*break*/, 6];
                case 4:
                    error_1 = _a.sent();
                    toast({
                        title: "Error",
                        description: "Failed to load registrations. Please try again.",
                        variant: "destructive",
                    });
                    return [3 /*break*/, 6];
                case 5:
                    setIsLoadingRegistrations(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    // Load registrations when component mounts
    (0, react_1.useEffect)(function () {
        loadRegistrations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event.id]);
    // Handle manual check-in by QR code
    var handleManualCheckIn = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var response, registration, error_2, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    if (!manualCode) {
                        toast({
                            title: "Error",
                            description: "Please enter a QR code",
                            variant: "destructive",
                        });
                        return [2 /*return*/];
                    }
                    setIsSubmitting(true);
                    setScanResult(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, (0, queryClient_1.apiRequest)("POST", "/api/registrations/check-in", {
                            qrCode: manualCode,
                            eventId: event.id
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    registration = _a.sent();
                    setScanResult({
                        success: true,
                        message: "Registration checked in successfully!",
                        registration: registration
                    });
                    onCheckInComplete();
                    // Reset the form
                    setManualCode("");
                    // Refresh the registrations list
                    loadRegistrations();
                    return [3 /*break*/, 6];
                case 4:
                    error_2 = _a.sent();
                    errorMessage = "Failed to check in attendee";
                    if (error_2 instanceof Error) {
                        errorMessage = error_2.message;
                    }
                    setScanResult({
                        success: false,
                        message: errorMessage
                    });
                    toast({
                        title: "Check-in Failed",
                        description: errorMessage,
                        variant: "destructive",
                    });
                    return [3 /*break*/, 6];
                case 5:
                    setIsSubmitting(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    // Handle check-in by selecting an attendee from the list
    var handleSelectCheckIn = function (e) { return __awaiter(_this, void 0, void 0, function () {
        var selectedRegistration, response, registration, error_3, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    e.preventDefault();
                    if (!registrationId) {
                        toast({
                            title: "Error",
                            description: "Please select an attendee to check in",
                            variant: "destructive",
                        });
                        return [2 /*return*/];
                    }
                    setIsSubmitting(true);
                    setScanResult(null);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    selectedRegistration = manualRegistrations.find(function (r) { return r.id.toString() === registrationId; });
                    if (!selectedRegistration) {
                        throw new Error("Registration not found");
                    }
                    return [4 /*yield*/, (0, queryClient_1.apiRequest)("POST", "/api/registrations/check-in", {
                            qrCode: selectedRegistration.qrCode,
                            eventId: event.id
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    registration = _a.sent();
                    setScanResult({
                        success: true,
                        message: "Registration checked in successfully!",
                        registration: registration
                    });
                    onCheckInComplete();
                    // Reset the form
                    setRegistrationId("");
                    // Refresh the registrations list
                    loadRegistrations();
                    return [3 /*break*/, 6];
                case 4:
                    error_3 = _a.sent();
                    errorMessage = "Failed to check in attendee";
                    if (error_3 instanceof Error) {
                        errorMessage = error_3.message;
                    }
                    setScanResult({
                        success: false,
                        message: errorMessage
                    });
                    toast({
                        title: "Check-in Failed",
                        description: errorMessage,
                        variant: "destructive",
                    });
                    return [3 /*break*/, 6];
                case 5:
                    setIsSubmitting(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    return (<card_1.Card className="w-full">
      <card_1.CardHeader>
        <card_1.CardTitle className="flex items-center gap-2">
          <lucide_react_1.QrCode className="h-5 w-5"/>
          Check-In for {event.title}
        </card_1.CardTitle>
      </card_1.CardHeader>
      <card_1.CardContent>
        <div className="space-y-6">
          <tabs_1.Tabs defaultValue="qrcode" className="w-full">
            <tabs_1.TabsList className="grid w-full grid-cols-2">
              <tabs_1.TabsTrigger value="qrcode">QR Code Check-in</tabs_1.TabsTrigger>
              <tabs_1.TabsTrigger value="attendee">Select Attendee</tabs_1.TabsTrigger>
            </tabs_1.TabsList>
            
            {/* QR Code Check-in Tab */}
            <tabs_1.TabsContent value="qrcode" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Enter a QR code to check in an attendee.
              </p>
              
              <form onSubmit={handleManualCheckIn} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="qrcode" className="text-sm font-medium">
                    QR Code
                  </label>
                  <input_1.Input id="qrcode" value={manualCode} onChange={function (e) { return setManualCode(e.target.value); }} placeholder="Enter QR code" disabled={isSubmitting}/>
                </div>
                
                <button_1.Button type="submit" disabled={isSubmitting || !manualCode}>
                  {isSubmitting ? (<>
                      <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                      Checking in...
                    </>) : (<>
                      <lucide_react_1.QrCode className="mr-2 h-4 w-4"/>
                      Check In
                    </>)}
                </button_1.Button>
              </form>
            </tabs_1.TabsContent>
            
            {/* Select Attendee Tab */}
            <tabs_1.TabsContent value="attendee" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Select an attendee from the list below to check them in.
              </p>
              
              <form onSubmit={handleSelectCheckIn} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="registration" className="text-sm font-medium">
                    Select Attendee
                  </label>
                  
                  <select_1.Select value={registrationId} onValueChange={setRegistrationId}>
                    <select_1.SelectTrigger className="w-full">
                      <select_1.SelectValue placeholder="Select an attendee"/>
                    </select_1.SelectTrigger>
                    <select_1.SelectContent>
                      {isLoadingRegistrations ? (<div className="flex items-center justify-center py-2">
                          <lucide_react_1.Loader2 className="h-4 w-4 animate-spin mr-2"/>
                          Loading...
                        </div>) : manualRegistrations.length === 0 ? (<div className="p-2 text-sm text-muted-foreground">
                          No registrations found
                        </div>) : (manualRegistrations.map(function (registration) { return (<select_1.SelectItem key={registration.id} value={registration.id.toString()} disabled={registration.checkedIn}>
                            <div className="flex items-center justify-between w-full">
                              <span>{registration.name}</span>
                              {registration.checkedIn && (<lucide_react_1.CheckCircle2 className="h-4 w-4 text-green-500 ml-2"/>)}
                            </div>
                          </select_1.SelectItem>); }))}
                    </select_1.SelectContent>
                  </select_1.Select>
                </div>
                
                <button_1.Button type="submit" disabled={isSubmitting || !registrationId}>
                  {isSubmitting ? (<>
                      <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                      Checking in...
                    </>) : (<>
                      <lucide_react_1.Ticket className="mr-2 h-4 w-4"/>
                      Check In Attendee
                    </>)}
                </button_1.Button>
              </form>
            </tabs_1.TabsContent>
          </tabs_1.Tabs>
          
          {/* Result display */}
          {scanResult && (<div className={"p-4 rounded-md ".concat(scanResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200")}>
              <div className="flex items-start gap-3">
                {scanResult.success ? (<lucide_react_1.CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5"/>) : (<lucide_react_1.AlertCircle className="h-5 w-5 text-red-500 mt-0.5"/>)}
                <div>
                  <p className={"font-medium ".concat(scanResult.success ? "text-green-700" : "text-red-700")}>
                    {scanResult.success ? "Check-in successful" : "Check-in failed"}
                  </p>
                  <p className="text-sm mt-1">
                    {scanResult.message}
                  </p>
                  {scanResult.registration && (<div className="mt-2">
                      <p className="text-sm font-medium">{scanResult.registration.name}</p>
                      <p className="text-xs text-muted-foreground">{scanResult.registration.email}</p>
                      <div className="mt-1">
                        <badge_1.Badge variant="outline" className="text-xs">
                          {new Date(scanResult.registration.checkedInAt).toLocaleString()}
                        </badge_1.Badge>
                      </div>
                    </div>)}
                </div>
              </div>
            </div>)}
          
          {/* Checked-in attendees list */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-2">Checked-in Attendees</h3>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {manualRegistrations.filter(function (r) { return r.checkedIn; }).length === 0 ? (<p className="text-sm text-muted-foreground">No attendees checked in yet</p>) : (manualRegistrations
            .filter(function (r) { return r.checkedIn; })
            .map(function (registration) { return (<div key={registration.id} className="flex items-center p-2 bg-gray-50 rounded-md">
                      <lucide_react_1.CheckCircle2 className="h-4 w-4 text-green-500 mr-2"/>
                      <div>
                        <p className="text-sm font-medium">{registration.name}</p>
                        <p className="text-xs text-muted-foreground">{registration.email}</p>
                      </div>
                    </div>); }))}
            </div>
          </div>
        </div>
      </card_1.CardContent>
    </card_1.Card>);
}
