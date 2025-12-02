import WSApiController from '#app/controllers/ws/ws-api-controller.js';

export default [
    {
        group: [
            {
                url: 'event_typing',
                handler: WSApiController.eventTyping,
                typeResponse: 'WSApiController.EventTypingResponse',
                description: 'Handle typing events',
                rateLimit: {
                    windowMs: 1 * 60 * 1000, // 1 minute
                    maxRequests: 30,  // Max 30 typing events per minute
                },
            },
            {
                url: 'read_message',
                handler: WSApiController.readMessage,
                typeResponse: 'WSApiController.ReadMessageResponse',
                validator: 'readMessages',
                description: 'Handle read message events',
            },
            {
                url: 'incoming_call',
                handler: WSApiController.incomingCall,
                typeResponse: 'WSApiController.IncomingCallResponse',
                description: 'Handle incoming call events',
            },
            {
                url: 'accept_call',
                handler: WSApiController.acceptIncomingCall,
                typeResponse: 'WSApiController.AcceptCallResponse',
                description: 'Handle accept call events',
            },
            {
                url: 'decline_call',
                handler: WSApiController.declineIncomingCall,
                typeResponse: 'WSApiController.DeclineCallResponse',
                description: 'Handle decline call events',
            },
            {
                url: 'webrtc_call_offer',
                handler: WSApiController.webrtcCallOffer,
                typeResponse: 'WSApiController.WebrtcCallOfferResponse',
                description: 'Handle webrtc call offer events',
            },
            {
                url: 'webrtc_call_answer',
                handler: WSApiController.webrtcCallAnswer,
                typeResponse: 'WSApiController.WebrtcCallAnswerResponse',
                description: 'Handle webrtc call answer events',
            },
            {
                url: 'webrtc_ice_candidate',
                handler: WSApiController.webrtcIceCandidate,
                typeResponse: 'WSApiController.WebrtcIceCandidateResponse',
                description: 'Handle webrtc ice candidate events',
            },
            {
                url: 'start_call',
                handler: WSApiController.webrtcStartCall,
                typeResponse: 'WSApiController.WebrtcStartCallResponse',
                description: 'Handle webrtc start call events',
            },
            {
                url: 'cancel_call',
                handler: WSApiController.webrtcCancelCall,
                typeResponse: 'WSApiController.WebrtcCancelCallResponse',
                description: 'Handle webrtc cancel call events',
            },
            {
                url: 'end_call',
                handler: WSApiController.webrtcCallEnd,
                typeResponse: 'WSApiController.WebrtcCallEndResponse',
                description: 'Handle webrtc call end events',
            },
            {
                url: 'webrtc_call_end',
                handler: WSApiController.webrtcCallEnd,
                typeResponse: 'WSApiController.WebrtcCallEndResponse',
                description: 'Handle webrtc call end events',
            },
            {
                url: 'webrtc_call_end_received',
                handler: WSApiController.webrtcCallEnd,
                typeResponse: 'WSApiController.WebrtcCallEndResponse',
                description: 'Handle webrtc call end events',
            },
            {
                url: 'error',
                handler: WSApiController.error,
                typeResponse: 'WSApiController.ErrorResponse',
                middlewares: ['test2'],
                description: 'Error handling test',
            },
            {
                url: 'test-ws',
                handler: WSApiController.testWs,
                typeResponse: 'WSApiController.TestWsResponse',
                description: 'Test WebSocket',
            },
            {
                url: 'save-user',
                handler: WSApiController.saveUser,
                typeResponse: 'WSApiController.SaveUserResponse',
                validator: 'register',
                description: 'Save user data',
                rateLimit: {
                    windowMs: 5 * 60 * 1000, // 5 minutes
                    maxRequests: 5, // Max 5 user save operations per 5 minutes
                },
            },
        ],
        prefix: 'main',
        description: 'Main routes',
        rateLimit: {
            windowMs: 1 * 60 * 1000, // 15 minutes
            maxRequests: 600, // Max 100 requests per 15 minutes for the whole group
        },
    },
];
