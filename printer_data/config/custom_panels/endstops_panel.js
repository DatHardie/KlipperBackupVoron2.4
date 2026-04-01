// endstops_panel.js
// Custom panel to display endstops status in Mainsail

MOONRAKER.customPanels = MOONRAKER.customPanels || {};

MOONRAKER.customPanels.endstopsPanel = {
    name: "Endstops Status",
    icon: "mdi-map-marker-radius",  // MDI icon to represent endstops
    sidebar_icon: true,
    
    // Panel data
    data() {
        return {
            endstops: [],
            loading: true,
            error: null,
            refreshInterval: null
        }
    },
    
    // HTML template for the panel
    template: `
        <v-card>
            <v-card-title class="py-2">
                <v-icon class="mr-2">mdi-map-marker-radius</v-icon>
                Endstops Status
                <v-spacer></v-spacer>
                <v-btn small color="primary" @click="queryEndstops" :loading="loading" class="mr-2">
                    <v-icon small class="mr-1">mdi-refresh</v-icon>Refresh
                </v-btn>
                <v-switch
                    v-model="autoRefresh"
                    label="Auto"
                    dense
                    hide-details
                    class="mt-0"
                ></v-switch>
            </v-card-title>
            
            <v-divider></v-divider>
            
            <v-card-text>
                <v-alert type="error" v-if="error" dense>{{ error }}</v-alert>
                
                <v-skeleton-loader type="list-item-three-line" v-if="loading && endstops.length === 0"></v-skeleton-loader>
                
                <div v-if="!loading && endstops.length === 0" class="text-center py-3">
                    <v-icon large color="grey lighten-1">mdi-map-marker-off</v-icon>
                    <div class="grey--text">No endstops detected</div>
                </div>
                
                <v-list v-if="endstops.length > 0">
                    <v-list-item v-for="(endstop, index) in endstops" :key="index">
                        <v-list-item-icon>
                            <v-icon :color="endstop.triggered ? 'success' : 'error'">
                                {{ endstop.triggered ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                            </v-icon>
                        </v-list-item-icon>
                        
                        <v-list-item-content>
                            <v-list-item-title>{{ endstop.name }}</v-list-item-title>
                            <v-list-item-subtitle>
                                <v-chip
                                    x-small
                                    :color="endstop.triggered ? 'success' : 'error'"
                                    text-color="white"
                                >
                                    {{ endstop.triggered ? 'TRIGGERED' : 'OPEN' }}
                                </v-chip>
                                <span class="ml-2 grey--text text--darken-1">{{ endstop.raw }}</span>
                            </v-list-item-subtitle>
                        </v-list-item-content>
                    </v-list-item>
                </v-list>
            </v-card-text>
            
            <v-card-actions class="px-4 pb-4">
                <div class="caption grey--text">
                    Last updated: {{ lastUpdated }}
                </div>
            </v-card-actions>
        </v-card>
    `,
    
    // Computed properties
    computed: {
        autoRefresh: {
            get() {
                return !!this.refreshInterval;
            },
            set(value) {
                if (value) {
                    this.startAutoRefresh();
                } else {
                    this.stopAutoRefresh();
                }
            }
        },
        
        lastUpdated() {
            return this.lastUpdateTime ? this.formatTime(this.lastUpdateTime) : 'Never';
        }
    },
    
    // Panel methods
    methods: {
        // Time formatting
        formatTime(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleTimeString();
        },
        
        // Start automatic refresh
        startAutoRefresh() {
            this.stopAutoRefresh();
            this.refreshInterval = setInterval(() => {
                this.queryEndstops();
            }, 5000); // Refresh every 5 seconds
        },
        
        // Stop automatic refresh
        stopAutoRefresh() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
        },
        
        // Query Klipper to get endstops status
        async queryEndstops() {
            this.loading = true;
            this.error = null;
            
            try {
                const response = await this.$store.dispatch('server/addQueuedGcode', {
                    gcode: 'QUERY_ENDSTOPS',
                    wait: true
                });
                
                // Parse the response
                if (response && Array.isArray(response.result)) {
                    this.parseEndstopsResponse(response.result);
                } else {
                    throw new Error('Invalid response format');
                }
                
                this.lastUpdateTime = Date.now();
            } catch (error) {
                console.error('Error querying endstops:', error);
                this.error = 'Unable to retrieve endstops status';
            } finally {
                this.loading = false;
            }
        },
        
        // Parse QUERY_ENDSTOPS response
        parseEndstopsResponse(endstopsData) {
            this.endstops = endstopsData.map(item => {
                const parts = item.split(':').map(part => part.trim());
                const name = parts[0];
                const state = parts[1] || '';
                const triggered = state.toLowerCase().includes('triggered');
                
                return {
                    name: name,
                    triggered: triggered,
                    raw: state,
                }
            });
        }
    },
    
    // Lifecycle hooks
    mounted() {
        // Load endstops on startup
        this.queryEndstops();
        
        // Start automatic refresh by default
        this.startAutoRefresh();
    },
    
    beforeDestroy() {
        // Cleanup before destruction
        this.stopAutoRefresh();
    }
};
